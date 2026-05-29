class ApiError implements Exception {
  const ApiError(
    this.message, {
    this.statusCode,
    this.payload,
  });

  final String message;
  final int? statusCode;
  final Map<String, dynamic>? payload;

  @override
  String toString() => message;
}