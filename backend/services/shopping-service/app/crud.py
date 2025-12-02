"""
Shopping Service CRUD operations.
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.events import publish_event
from .core.config import settings

from . import models, schemas


def _publish(event_type: str, payload: dict) -> None:
    publish_event(settings.KAFKA_SHOPPING_TOPIC, {"event_type": event_type, **payload})


def _recalculate_totals(cart: models.ShoppingCart) -> None:
    subtotal = 0.0
    discount_total = 0.0
    for item in cart.items:
        item.total_price = (item.unit_price * item.quantity) - item.discount_amount
        subtotal += item.unit_price * item.quantity
        discount_total += item.discount_amount

    cart.subtotal = round(subtotal, 2)
    cart.discount_amount = round(discount_total, 2)
    cart.tax_amount = round(cart.subtotal * 0.07, 2) if cart.subtotal else 0.0
    cart.total_amount = round(cart.subtotal - cart.discount_amount + cart.tax_amount, 2)


def _ensure_cart(db: Session, cart_id: int) -> models.ShoppingCart:
    cart = db.get(models.ShoppingCart, cart_id)
    if not cart:
        raise ValueError("Cart not found.")
    return cart


def create_cart(db: Session, cart: schemas.ShoppingCartCreate) -> models.ShoppingCart:
    db_cart = models.ShoppingCart(user_id=cart.user_id, currency=cart.currency)
    db.add(db_cart)
    db.commit()
    db.refresh(db_cart)
    _publish("cart_created", {"cart_id": db_cart.id, "user_id": db_cart.user_id})
    return db_cart


def get_cart(db: Session, cart_id: int) -> Optional[models.ShoppingCart]:
    return db.get(models.ShoppingCart, cart_id)


def get_user_cart(db: Session, user_id: str) -> Optional[models.ShoppingCart]:
    return (
        db.query(models.ShoppingCart)
        .filter(models.ShoppingCart.user_id == user_id, models.ShoppingCart.status == "active")
        .order_by(models.ShoppingCart.id.desc())
        .first()
    )


def add_cart_item(db: Session, cart_id: int, item: schemas.CartItemCreate) -> models.CartItem:
    cart = _ensure_cart(db, cart_id)

    existing_item = (
        db.query(models.CartItem)
        .filter(models.CartItem.cart_id == cart_id, models.CartItem.game_id == item.game_id)
        .first()
    )
    if existing_item:
        existing_item.quantity += item.quantity
        existing_item.discount_amount = item.discount_amount
        existing_item.unit_price = item.unit_price
        db_item = existing_item
    else:
        db_item = models.CartItem(
            cart_id=cart_id,
            game_id=item.game_id,
            game_name=item.game_name,
            unit_price=item.unit_price,
            quantity=item.quantity,
            discount_amount=item.discount_amount,
        )
        db.add(db_item)

    _recalculate_totals(cart)
    db.commit()
    db.refresh(db_item)
    db.refresh(cart)

    _publish(
        "cart_item_added",
        {"cart_id": cart_id, "user_id": cart.user_id, "game_id": db_item.game_id, "quantity": db_item.quantity},
    )
    return db_item


def update_cart_item(db: Session, item_id: int, item_update: schemas.CartItemUpdate) -> Optional[models.CartItem]:
    db_item = db.get(models.CartItem, item_id)
    if not db_item:
        return None

    updates = item_update.model_dump(exclude_unset=True)
    if "quantity" in updates and updates["quantity"] == 0:
        return remove_cart_item(db, item_id)

    for field, value in updates.items():
        setattr(db_item, field, value)

    _recalculate_totals(db_item.cart)
    db.commit()
    db.refresh(db_item)
    return db_item


def remove_cart_item(db: Session, item_id: int) -> Optional[models.CartItem]:
    db_item = db.get(models.CartItem, item_id)
    if not db_item:
        return None

    cart = db_item.cart
    db.delete(db_item)
    _recalculate_totals(cart)
    db.commit()
    return db_item


def clear_cart(db: Session, cart_id: int) -> None:
    cart = _ensure_cart(db, cart_id)
    db.query(models.CartItem).filter(models.CartItem.cart_id == cart_id).delete()
    cart.subtotal = 0.0
    cart.discount_amount = 0.0
    cart.tax_amount = 0.0
    cart.total_amount = 0.0
    db.commit()
    _publish("cart_cleared", {"cart_id": cart_id, "user_id": cart.user_id})


def create_wishlist(db: Session, wishlist: schemas.WishlistCreate) -> models.Wishlist:
    db_wishlist = models.Wishlist(
        user_id=wishlist.user_id,
        name=wishlist.name,
        description=wishlist.description,
        is_public=wishlist.is_public,
    )
    db.add(db_wishlist)
    db.commit()
    db.refresh(db_wishlist)
    _publish("wishlist_created", {"wishlist_id": db_wishlist.id, "user_id": db_wishlist.user_id})
    return db_wishlist


def get_wishlist(db: Session, wishlist_id: int) -> Optional[models.Wishlist]:
    return db.get(models.Wishlist, wishlist_id)


def get_user_wishlists(db: Session, user_id: str) -> List[models.Wishlist]:
    return (
        db.query(models.Wishlist)
        .filter(models.Wishlist.user_id == user_id)
        .order_by(models.Wishlist.created_at.asc())
        .all()
    )


def add_wishlist_item(db: Session, wishlist_id: int, item: schemas.WishlistItemCreate) -> models.WishlistItem:
    wishlist = get_wishlist(db, wishlist_id)
    if not wishlist:
        raise ValueError("Wishlist not found.")

    existing = (
        db.query(models.WishlistItem)
        .filter(models.WishlistItem.wishlist_id == wishlist_id, models.WishlistItem.game_id == item.game_id)
        .first()
    )
    if existing:
        return existing

    db_item = models.WishlistItem(
        wishlist_id=wishlist_id,
        game_id=item.game_id,
        game_name=item.game_name,
        price_when_added=item.price_when_added,
        currency=item.currency,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    _publish("wishlist_item_added", {"wishlist_id": wishlist_id, "game_id": item.game_id})
    return db_item


def remove_wishlist_item(db: Session, item_id: int) -> bool:
    db_item = db.get(models.WishlistItem, item_id)
    if not db_item:
        return False
    db.delete(db_item)
    db.commit()
    _publish("wishlist_item_removed", {"wishlist_id": db_item.wishlist_id, "game_id": db_item.game_id})
    return True
