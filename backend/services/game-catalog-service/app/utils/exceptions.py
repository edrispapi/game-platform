"""Domain-specific exceptions."""


class ServiceError(Exception):
    """Base class for service-layer errors."""


class ConflictError(ServiceError):
    """Raised when creating/updating resources conflicts with existing data."""


class NotFoundError(ServiceError):
    """Raised when a resource cannot be located."""


