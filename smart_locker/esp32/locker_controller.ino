#include <Adafruit_GFX.h>
#include <Adafruit_NeoPixel.h>
#include <Adafruit_SSD1306.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>

// Wi-Fi credentials
const char* ssid = "HUAWEI-E8372-3A0F";
const char* password = "55529256";
// MQTT broker settings
const char *mqttServer = "3e037e542d2944a3ae4266e4d6f6c874.s1.eu.hivemq.cloud";
const int mqttPort = 8883;
const char *mqttUser = "smartlocker";
const char *mqttPassword = "Chamikaudu415";

// -------- LOCKER SETUP --------
const int lockerCount = 2;
const char *lockerCodes[lockerCount] = {"L1", "L2"};

// Pins
const int relayPin = 23;   // L1 relay
const int relayPinL2 = 18; // L2 relay
const int ledBuiltin = 2;

// LED Strip Pins and Configuration
#define L1_STRIP_PIN 19
#define L2_STRIP_PIN 25
#define LED_COUNT 14

Adafruit_NeoPixel stripL1(LED_COUNT, L1_STRIP_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel stripL2(LED_COUNT, L2_STRIP_PIN, NEO_GRB + NEO_KHZ800);
const int doorSensorPin = 4;
const int doorSensorPinL2 = 17;
const int doorIndicatorPin = 16; // External LED for L1 door open/close status
const int beeperPin = 27;        // 3-pin buzzer module I/O
const bool beeperActiveLow =
    true; // This buzzer module variant is LOW-trigger in most cases

// Vibration sensor (L1 security)
const int vibrationSensorPin = 26; // SW-420 Digital Output

// OLED Display pins (I2C)
const int SDA_PIN = 21;
const int SCL_PIN = 22;
const int SDA2_PIN = 32;
const int SCL2_PIN = 33;
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
TwoWire WireL2 = TwoWire(1);
Adafruit_SSD1306 displayL2(SCREEN_WIDTH, SCREEN_HEIGHT, &WireL2, -1);

// MQTT topics
char lockerControlTopics[lockerCount][64];
char lockerStateTopics[lockerCount][64];
char lockerDoorTopics[lockerCount][64];
char lockerBookingTopics[lockerCount][64];
char lockerSecurityTopics[lockerCount][64];
char lockerMaintenanceTopics[lockerCount][64];
char legacyControlTopics[lockerCount][64];
char legacyBookingTopics[lockerCount][64];
char legacySecurityTopics[lockerCount][64];
char legacyMaintenanceTopics[lockerCount][64];

bool lockerIsMaintenance[lockerCount] = {false, false};

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// Door state (only for L1)
String lastDoorState = "UNKNOWN";
String lastDoorStateL2 = "UNKNOWN";

// Vibration sensor state tracking
bool vibrationDetected = false;
unsigned long vibrationLastDetectedAt = 0;
const unsigned long vibrationDebounceMs = 100; // Debounce time to avoid noise

// Locker 1 display states
String lockerStateDisplay = "LOCKED";
String lockerActionDisplay = "";
String doorStateDisplay = "CLOSED";
String lockerBookingDisplay = "FREE";
String locker2StateDisplay = "LOCKED";
String doorStateDisplayL2 = "CLOSED";
String locker2BookingDisplay = "FREE";
bool locker1IsLocked = true;
bool locker2IsLocked = true;
bool securityAlarmActiveL1 = false;
bool securityAlarmActiveL2 = false;
bool securityBeeperOn = false;
bool securityIgnoreLatchedL1 = false;
bool securityIgnoreLatchedL2 = false;
bool ledBlinkState = false;
unsigned long securityAlarmLastToggleAt = 0;
const unsigned long securityAlarmIntervalMs = 150; // Police siren rapid toggle
unsigned long securityWarningAnimationLastStepAt = 0;
int securityWarningWordX = 0;
int securityWarningWordDirection = 1;
bool displayNeedsUpdate = true;
bool displayNeedsUpdateL2 = true;
unsigned long lastDisplayRefreshAt = 0;
const unsigned long displayRefreshIntervalMs = 5000;

void setSecurityBeeper(bool on) {
  securityBeeperOn = on;
  int level = on ? HIGH : LOW;
  if (beeperActiveLow) {
    level = on ? LOW : HIGH;
  }
  digitalWrite(beeperPin, level);
}

void runBeeperStartupTest() {
  Serial.println("Beeper self-test start");
  setSecurityBeeper(true);
  delay(1000);
  setSecurityBeeper(false);
  delay(500);
  setSecurityBeeper(true);
  delay(1000);
  setSecurityBeeper(false);
  Serial.println("Beeper self-test end");
}

void clearSecurityAlarm(int i, bool forceDoorClosed) {
  if (i == 0) {
    if (!securityAlarmActiveL1 && !forceDoorClosed) {
      return;
    }

    securityAlarmActiveL1 = false;
    vibrationDetected = false;
    if (!forceDoorClosed) {
      securityIgnoreLatchedL1 = false;
    }

    if (!securityAlarmActiveL2) {
      setSecurityBeeper(false);
    }

    if (forceDoorClosed) {
      securityIgnoreLatchedL1 = true;
      digitalWrite(doorIndicatorPin, LOW);
      doorStateDisplay = "CLOSED";
      lastDoorState = "CLOSED";
      mqttClient.publish(lockerDoorTopics[0], "CLOSED", true);
    }

    lockerActionDisplay = "";
    securityWarningWordX = 0;
    securityWarningWordDirection = 1;
    displayNeedsUpdate = true;
  } else if (i == 1) {
    if (!securityAlarmActiveL2 && !forceDoorClosed) {
      return;
    }

    securityAlarmActiveL2 = false;
    if (!forceDoorClosed) {
      securityIgnoreLatchedL2 = false;
    }

    if (!securityAlarmActiveL1) {
      setSecurityBeeper(false);
    }

    if (forceDoorClosed) {
      securityIgnoreLatchedL2 = true;
      doorStateDisplayL2 = "CLOSED";
      lastDoorStateL2 = "CLOSED";
      mqttClient.publish(lockerDoorTopics[1], "CLOSED", true);
    }
    displayNeedsUpdateL2 = true;
  }
  updateLockerLeds();
}

void triggerSecurityAlarm(int i, const char *reason) {
  if (i == 0) {
    if (securityAlarmActiveL1) {
      return;
    }
    securityAlarmActiveL1 = true;
    securityAlarmLastToggleAt = millis();
    setSecurityBeeper(true);
    lockerActionDisplay = "SECURITY!";
    displayNeedsUpdate = true;

    Serial.printf("SECURITY ALERT (L1): %s\n", reason);
    mqttClient.publish(lockerSecurityTopics[0], "ALERT", true);
  } else if (i == 1) {
    if (securityAlarmActiveL2) {
      return;
    }
    securityAlarmActiveL2 = true;
    securityAlarmLastToggleAt = millis();
    setSecurityBeeper(true);
    displayNeedsUpdateL2 = true;

    Serial.printf("SECURITY ALERT (L2): %s\n", reason);
    mqttClient.publish(lockerSecurityTopics[1], "ALERT", true);
  }
}

void updateSecurityAlarm() {
  if (!securityAlarmActiveL1 && !securityAlarmActiveL2) {
    return;
  }

  unsigned long now = millis();

  if (securityAlarmActiveL1) {
    if (now - securityWarningAnimationLastStepAt >= 180) {
      securityWarningAnimationLastStepAt = now;
      securityWarningWordX += securityWarningWordDirection;
      if (securityWarningWordX >= 78) {
        securityWarningWordDirection = -1;
      } else if (securityWarningWordX <= 0) {
        securityWarningWordDirection = 1;
      }
      displayNeedsUpdate = true;
    }
  }

  if (now - securityAlarmLastToggleAt >= securityAlarmIntervalMs) {
    securityAlarmLastToggleAt = now;
    setSecurityBeeper(!securityBeeperOn);
    
    ledBlinkState = !ledBlinkState;
    
    if (securityAlarmActiveL1) {
      if (ledBlinkState) {
        stripL1.fill(stripL1.Color(255, 0, 0)); // Red
      } else {
        stripL1.fill(stripL1.Color(0, 0, 255)); // Blue
      }
      stripL1.show();
    }
    
    if (securityAlarmActiveL2) {
      if (ledBlinkState) {
        stripL2.fill(stripL2.Color(255, 0, 0)); // Red
      } else {
        stripL2.fill(stripL2.Color(0, 0, 255)); // Blue
      }
      stripL2.show();
    }
  }
}

// ---------------- DISPLAY UPDATE (L1 ONLY) ----------------
void updateDisplay() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  if (securityAlarmActiveL1) {
    display.setTextSize(2);
    display.setCursor(0, 10);
    display.println("WARNING!");

    display.setTextSize(1);
    display.setCursor(0, 34);
    if (vibrationDetected) {
      display.println("Vibration!");
      display.println("Break-in attempt?");
    } else {
      display.println("Door opened");
    }

    display.setCursor(securityWarningWordX, 52);
    display.println("ALERT");
  } else {
    display.setTextSize(1);
    display.setCursor(0, 0);

    // Title
    display.setTextSize(2);
    display.println("LOCKER 1");

    // Status
    display.setTextSize(1);
    display.print("State: ");
    display.println(lockerStateDisplay);

    // Action
    if (lockerActionDisplay.length() > 0) {
      display.print("Action: ");
      display.println(lockerActionDisplay);
    }

    // Door
    display.print("Door: ");
    display.println(doorStateDisplay);

    // Booking
    display.print("Status: ");
    display.println(lockerBookingDisplay);
  }

  display.display();
}

void updateDisplayL2() {
  displayL2.clearDisplay();
  displayL2.setTextColor(SSD1306_WHITE);

  if (securityAlarmActiveL2) {
    displayL2.setTextSize(2);
    displayL2.setCursor(0, 10);
    displayL2.println("WARNING!");

    displayL2.setTextSize(1);
    displayL2.setCursor(0, 34);
    displayL2.println("Door opened");

    displayL2.setCursor(0, 52);
    displayL2.println("ALERT");
  } else {
    displayL2.setTextSize(1);
    displayL2.setCursor(0, 0);

    displayL2.setTextSize(2);
    displayL2.println("LOCKER 2");

    displayL2.setTextSize(1);
    displayL2.print("State: ");
    displayL2.println(locker2StateDisplay);
    displayL2.print("Door: ");
    displayL2.println(doorStateDisplayL2);
    displayL2.print("Status: ");
    displayL2.println(locker2BookingDisplay);
  }

  displayL2.display();
}

// ---------------- UPDATE LOCKER LEDS ----------------
void updateLockerLeds() {
  if (!securityAlarmActiveL1) {
    if (lockerIsMaintenance[0]) {
      stripL1.fill(stripL1.Color(255, 255, 0)); // Yellow
    } else if (lockerBookingDisplay == "BOOKED") {
      stripL1.fill(stripL1.Color(255, 0, 0)); // Red
    } else {
      stripL1.fill(stripL1.Color(0, 255, 0)); // Green
    }
    stripL1.show();
  }

  if (!securityAlarmActiveL2) {
    if (lockerIsMaintenance[1]) {
      stripL2.fill(stripL2.Color(255, 255, 0)); // Yellow
    } else if (locker2BookingDisplay == "BOOKED") {
      stripL2.fill(stripL2.Color(255, 0, 0)); // Red
    } else {
      stripL2.fill(stripL2.Color(0, 255, 0)); // Green
    }
    stripL2.show();
  }
}

// ---------------- APPLY STATE ----------------
void applyLockerState(int i, bool locked) {

  // 🔹 L1 → RELAY (same logic as L2-L4)
  if (i == 0) {
    locker1IsLocked = locked;

    if (locked) {
      digitalWrite(relayPin, LOW); // OFF
      digitalWrite(ledBuiltin, LOW);
      lockerStateDisplay = "LOCKED";
      lockerActionDisplay = "";

      if (doorStateDisplay == "OPEN") {
        triggerSecurityAlarm(0, "Door opened while locker is locked");
      }
    } else {
      digitalWrite(relayPin, HIGH); // ON
      digitalWrite(ledBuiltin, HIGH);
      lockerStateDisplay = "UNLOCKED";
      lockerActionDisplay = "";
      securityIgnoreLatchedL1 = false;
      clearSecurityAlarm(0, false);
    }
    displayNeedsUpdate = true;
  }

  // 🔹 L2 → RELAY
  else if (i == 1) {
    locker2IsLocked = locked;
    locker2StateDisplay = locked ? "LOCKED" : "UNLOCKED";

    if (locked) {
      digitalWrite(relayPinL2, LOW); // OFF
      if (doorStateDisplayL2 == "OPEN") {
        triggerSecurityAlarm(1, "Door opened while locker is locked");
      }
    } else {
      digitalWrite(relayPinL2, HIGH); // ON
      securityIgnoreLatchedL2 = false;
      clearSecurityAlarm(1, false);
    }
    displayNeedsUpdateL2 = true;
  }

  // Publish state
  if (locked) {
    mqttClient.publish(lockerStateTopics[i], "LOCKED", true);
  } else {
    mqttClient.publish(lockerStateTopics[i], "UNLOCKED", true);
  }
}

void publishDoorStateL2() {
  String currentDoorState =
      digitalRead(doorSensorPinL2) == HIGH ? "OPEN" : "CLOSED";

  if (securityIgnoreLatchedL2 && locker2IsLocked) {
    if (currentDoorState == "OPEN") {
      return;
    }
    securityIgnoreLatchedL2 = false;
  }

  if (currentDoorState != lastDoorStateL2) {
    Serial.printf("Door sensor L2: %s -> publishing %s to %s\n",
                  currentDoorState.c_str(), currentDoorState.c_str(),
                  lockerDoorTopics[1]);
    mqttClient.publish(lockerDoorTopics[1], currentDoorState.c_str(), true);
    lastDoorStateL2 = currentDoorState;

    doorStateDisplayL2 = currentDoorState;
    displayNeedsUpdateL2 = true;

    if (currentDoorState == "OPEN" && locker2IsLocked) {
      triggerSecurityAlarm(1, "Door sensor reported OPEN while locked");
    }

    if (currentDoorState == "CLOSED") {
      clearSecurityAlarm(1, false);

      // Auto-lock L2 when user closes the door after using locker.
      if (!locker2IsLocked) {
        applyLockerState(1, true);
      }
    }
  }
}

// ---------------- DOOR SENSOR (L1 ONLY) ----------------
void publishDoorState() {
  String currentDoorState =
      digitalRead(doorSensorPin) == HIGH ? "OPEN" : "CLOSED";

  if (securityIgnoreLatchedL1 && locker1IsLocked) {
    if (currentDoorState == "OPEN") {
      return;
    }
    securityIgnoreLatchedL1 = false;
  }

  if (currentDoorState == "OPEN") {
    digitalWrite(doorIndicatorPin, HIGH);
  } else {
    digitalWrite(doorIndicatorPin, LOW);
  }

  if (currentDoorState != lastDoorState) {
    Serial.printf("Door sensor: %s -> publishing %s to %s\n",
                  currentDoorState.c_str(), currentDoorState.c_str(),
                  lockerDoorTopics[0]);
    mqttClient.publish(lockerDoorTopics[0], currentDoorState.c_str(), true);
    lastDoorState = currentDoorState;

    // Update display
    doorStateDisplay = currentDoorState;
    displayNeedsUpdate = true;

    if (currentDoorState == "OPEN" && locker1IsLocked) {
      vibrationDetected = false;
      triggerSecurityAlarm(0, "Door sensor reported OPEN while locked");
    }

    if (currentDoorState == "CLOSED") {
      clearSecurityAlarm(0, false);

      // Auto-lock L1 when user closes the door after using locker.
      if (!locker1IsLocked) {
        applyLockerState(0, true);
      }
    }
  }
}

// ---------------- MQTT CALLBACK ----------------
void mqttCallback(char *topic, byte *payload, unsigned int length) {

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  message.trim();
  message.toUpperCase();

  Serial.printf("MQTT msg topic=%s payload=%s\n", topic, message.c_str());

  String incomingTopic = String(topic);

  // Booking status updates for Locker 1 OLED (supports canonical + legacy
  // topics)
  if (incomingTopic == lockerBookingTopics[0] ||
      incomingTopic == legacyBookingTopics[0]) {
    if (message == "BOOKED" || message == "TRUE" || message == "1" ||
        message == "YES" || message == "OCCUPIED") {
      lockerBookingDisplay = "BOOKED";
      displayNeedsUpdate = true;
    } else if (message == "FREE" || message == "FALSE" || message == "0" ||
               message == "NO" || message == "AVAILABLE") {
      lockerBookingDisplay = "FREE";
      displayNeedsUpdate = true;
    }
    updateLockerLeds();
  }

  if (incomingTopic == lockerBookingTopics[1] ||
      incomingTopic == legacyBookingTopics[1]) {
    if (message == "BOOKED" || message == "TRUE" || message == "1" ||
        message == "YES" || message == "OCCUPIED") {
      locker2BookingDisplay = "BOOKED";
      displayNeedsUpdateL2 = true;
    } else if (message == "FREE" || message == "FALSE" || message == "0" ||
               message == "NO" || message == "AVAILABLE") {
      locker2BookingDisplay = "FREE";
      displayNeedsUpdateL2 = true;
    }
    updateLockerLeds();
  }

  if (incomingTopic == lockerMaintenanceTopics[0] ||
      incomingTopic == legacyMaintenanceTopics[0]) {
    if (message == "MAINTENANCE_ON") {
      lockerIsMaintenance[0] = true;
    } else if (message == "MAINTENANCE_OFF") {
      lockerIsMaintenance[0] = false;
    }
    updateLockerLeds();
  }

  if (incomingTopic == lockerMaintenanceTopics[1] ||
      incomingTopic == legacyMaintenanceTopics[1]) {
    if (message == "MAINTENANCE_ON") {
      lockerIsMaintenance[1] = true;
    } else if (message == "MAINTENANCE_OFF") {
      lockerIsMaintenance[1] = false;
    }
    updateLockerLeds();
  }

  // Security ignore command for Locker 1 (stops beeper and normalizes state)
  if (incomingTopic == lockerSecurityTopics[0] ||
      incomingTopic == legacySecurityTopics[0]) {
    if (message == "IGNORE") {
      Serial.println("Security alert ignored by user/admin");
      bool doorCurrentlyOpen = digitalRead(doorSensorPin) == HIGH;
      bool forceDoorClosed = locker1IsLocked && doorCurrentlyOpen;
      clearSecurityAlarm(0, forceDoorClosed);
    }
  }

  // Security ignore command for Locker 2
  if (incomingTopic == lockerSecurityTopics[1] ||
      incomingTopic == legacySecurityTopics[1]) {
    if (message == "IGNORE") {
      Serial.println("Security alert ignored for Locker 2 by user/admin");
      bool doorCurrentlyOpen = digitalRead(doorSensorPinL2) == HIGH;
      bool forceDoorClosed = locker2IsLocked && doorCurrentlyOpen;
      clearSecurityAlarm(1, forceDoorClosed);
    }
  }

  for (int i = 0; i < lockerCount; i++) {

    if (incomingTopic == lockerControlTopics[i] ||
        incomingTopic == legacyControlTopics[i]) {

      if (message == "LOCK") {
        applyLockerState(i, true);
      } else if (message == "UNLOCK") {
        applyLockerState(i, false);
      }
    }
  }
}

// ---------------- WIFI ----------------
void connectWifi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi connected");
  Serial.println(WiFi.localIP());
}

// ---------------- MQTT ----------------
void connectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");

    if (mqttClient.connect("esp32-multi-locker", mqttUser, mqttPassword)) {
      Serial.println("connected");

      for (int i = 0; i < lockerCount; i++) {
        mqttClient.subscribe(lockerControlTopics[i]);
        mqttClient.subscribe(legacyControlTopics[i]);
        mqttClient.subscribe(lockerBookingTopics[i]);
        mqttClient.subscribe(legacyBookingTopics[i]);
        mqttClient.subscribe(lockerSecurityTopics[i]);
        mqttClient.subscribe(legacySecurityTopics[i]);
        mqttClient.subscribe(lockerMaintenanceTopics[i]);
        mqttClient.subscribe(legacyMaintenanceTopics[i]);

        Serial.printf("Subscribed: %s\n", lockerControlTopics[i]);
        Serial.printf("Subscribed (legacy): %s\n", legacyControlTopics[i]);
        Serial.printf("Subscribed booking: %s\n", lockerBookingTopics[i]);
        Serial.printf("Subscribed booking (legacy): %s\n",
                      legacyBookingTopics[i]);
        Serial.printf("Subscribed security: %s\n", lockerSecurityTopics[i]);
        Serial.printf("Subscribed security (legacy): %s\n",
                      legacySecurityTopics[i]);
        Serial.printf("Subscribed maintenance: %s\n", lockerMaintenanceTopics[i]);
        Serial.printf("Subscribed maintenance (legacy): %s\n",
                      legacyMaintenanceTopics[i]);
        Serial.printf("Door topic: %s\n", lockerDoorTopics[i]);

        applyLockerState(i, true); // default LOCKED
      }

    } else {
      Serial.print("failed, rc=");
      Serial.println(mqttClient.state());
      delay(3000);
    }
  }
}

// ---------------- VIBRATION SENSOR (L1 ONLY) ----------------
void checkVibrationSensor() {
  int sensorState = digitalRead(vibrationSensorPin);
  unsigned long now = millis();

  // Only monitor vibrations when locker is LOCKED
  if (!locker1IsLocked) {
    vibrationDetected = false;
    return;
  }

  // Debounce: only process state changes after debounce period
  if (sensorState == HIGH && !vibrationDetected &&
      now - vibrationLastDetectedAt >= vibrationDebounceMs) {
    vibrationDetected = true;
    vibrationLastDetectedAt = now;
    Serial.println("VIBRATION DETECTED on L1 while locked!");
    triggerSecurityAlarm(0, "Vibration detected - possible break-in");
    mqttClient.publish(lockerSecurityTopics[0], "VIBRATION_ALERT", true);
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  for (int i = 0; i < lockerCount; i++) {

    // Topics
    snprintf(lockerControlTopics[i], sizeof(lockerControlTopics[i]),
             "locker/%s/control", lockerCodes[i]);

    snprintf(lockerStateTopics[i], sizeof(lockerStateTopics[i]),
             "locker/%s/state", lockerCodes[i]);

    snprintf(lockerDoorTopics[i], sizeof(lockerDoorTopics[i]), "locker/%s/door",
             lockerCodes[i]);

    snprintf(lockerBookingTopics[i], sizeof(lockerBookingTopics[i]),
             "locker/%s/booking", lockerCodes[i]);

    snprintf(lockerSecurityTopics[i], sizeof(lockerSecurityTopics[i]),
             "locker/%s/security", lockerCodes[i]);

    snprintf(lockerMaintenanceTopics[i], sizeof(lockerMaintenanceTopics[i]),
             "locker/%s/maintenance", lockerCodes[i]);

    // Legacy topic (locker/1/control)
    const char *codePart = lockerCodes[i];
    if (lockerCodes[i][0] == 'L') {
      codePart = lockerCodes[i] + 1;
    }

    snprintf(legacyControlTopics[i], sizeof(legacyControlTopics[i]),
             "locker/%s/control", codePart);

    snprintf(legacyBookingTopics[i], sizeof(legacyBookingTopics[i]),
             "locker/%s/booking", codePart);

    snprintf(legacySecurityTopics[i], sizeof(legacySecurityTopics[i]),
             "locker/%s/security", codePart);

    snprintf(legacyMaintenanceTopics[i], sizeof(legacyMaintenanceTopics[i]),
             "locker/%s/maintenance", codePart);

    Serial.printf("Locker: %s\n", lockerCodes[i]);
    Serial.printf("Topic: %s\n", lockerControlTopics[i]);
  }

  // Pin setup
  pinMode(relayPin, OUTPUT);
  pinMode(relayPinL2, OUTPUT);
  pinMode(ledBuiltin, OUTPUT);
  pinMode(doorSensorPin, INPUT_PULLUP);
  pinMode(doorSensorPinL2, INPUT_PULLUP);
  pinMode(doorIndicatorPin, OUTPUT);
  pinMode(beeperPin, OUTPUT);
  pinMode(vibrationSensorPin, INPUT); // SW-420 vibration sensor
  digitalWrite(doorIndicatorPin, LOW);
  setSecurityBeeper(false);
  runBeeperStartupTest();

  // Initialize LED Strips
  stripL1.begin();
  stripL1.setBrightness(20);
  stripL1.clear();
  stripL1.show();

  stripL2.begin();
  stripL2.setBrightness(20);
  stripL2.clear();
  stripL2.show();

  updateLockerLeds();

  // Initialize OLED Display
  Wire.begin(SDA_PIN, SCL_PIN);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED initialization failed!");
  } else {
    Serial.println("OLED initialized successfully");
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("LOCKER 1");
    display.println("Initializing...");
    display.display();
  }

  // Initialize L2 OLED Display on a second I2C bus
  WireL2.begin(SDA2_PIN, SCL2_PIN);
  if (!displayL2.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("L2 OLED initialization failed!");
  } else {
    Serial.println("L2 OLED initialized successfully");
    displayL2.clearDisplay();
    displayL2.setTextSize(1);
    displayL2.setTextColor(SSD1306_WHITE);
    displayL2.setCursor(0, 0);
    displayL2.println("LOCKER 2");
    displayL2.println("Initializing...");
    displayL2.display();
  }

  connectWifi();

  wifiClient.setInsecure();
  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(mqttCallback);
}

// ---------------- LOOP ----------------
void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  if (!mqttClient.connected()) {
    connectMqtt();
  }

  mqttClient.loop();
  publishDoorState();
  publishDoorStateL2();
  updateSecurityAlarm();
  checkVibrationSensor(); // Monitor vibrations when locked

  unsigned long now = millis();
  if (now - lastDisplayRefreshAt >= displayRefreshIntervalMs) {
    lastDisplayRefreshAt = now;
    displayNeedsUpdate = true;
    displayNeedsUpdateL2 = true;
  }

  // Update display if needed
  if (displayNeedsUpdate) {
    updateDisplay();
    displayNeedsUpdate = false;
  }

  if (displayNeedsUpdateL2) {
    updateDisplayL2();
    displayNeedsUpdateL2 = false;
  }
}
