"""Custom exceptions used across services."""


class ServiceError(Exception):
    """Base class for domain/service errors."""


class ConflictError(ServiceError):
    """Raised when a resource conflicts with an existing record."""


class NotFoundError(ServiceError):
    """Raised when a resource cannot be located."""


