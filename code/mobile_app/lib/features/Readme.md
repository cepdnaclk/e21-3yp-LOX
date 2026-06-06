# Features

This directory contains the user-facing modules of the mobile app.

- `auth/`: Authentication flow screens (`AuthScreen`, login, register).
- `home/`: Post-login experience (`HomeScreen`) with Explore, Bookings, and Account tabs.

At app startup, session restoration decides which feature is shown first: unauthenticated users go to `auth`, and authenticated users go to `home`.

register & login
select current location
filter according to acsending order wrt current location
request for membership of a station
reserve a locker (only one station can limit in one station per one user)
release a locker / lock / unlock / door open or close status
free time limit and overdue time calculations
