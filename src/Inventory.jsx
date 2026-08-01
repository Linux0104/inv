import React, { useEffect, useState, useRef } from 'react'
import $ from 'jquery'
import 'jquery-ui/ui/widgets/draggable'
import 'jquery-ui/ui/widgets/droppable'
import {Animated} from 'react-animated-css'
import { Textfit } from 'react-textfit';
import { toast } from 'react-toastify';
import { useInventory } from './App.jsx';

export default function Inventory({type, title, weight, items}) {
    const {sound, locales, clickSound, moveSound, setLock, lock, selectItem, counter, otherInventory, resName, search, activeTab, contextMenu, setContextMenu} = useInventory()

    // Droppable Area
    const dropRef = React.useRef()
    useEffect(() => {
        $(dropRef.current).droppable({
            hoverClass: 'hovering',
            drop: (e, ui) => {
                const item = ui.draggable.data('item');

                if (item.inventory === 'hotbar') return;

                ui.helper.data('dropped', true);

                if (counter.current.value < 1) return;
                if (otherInventory && !otherInventory.items) return;
                if (type === item.inventory) return;
                if (item.inventory === 'main' && !item.remove) return;
                if (type === 'shop') return;
                if (lock) return;
                
                if (sound) {
                    moveSound.pause()
                    moveSound.currentTime = 0;
                    moveSound.play()
                }
                
                if (type === 'main') {
                    setLock(true)
                    // Use counter.current.value ONLY if it's reliable, otherwise use state passed via context if possible
                    // But counter is a ref from context.
                    $.post(`https://${resName}/MoveItemToPlayer`, JSON.stringify({
                        item: item,
                        count: parseInt(counter.current.value) || 1
                    }), () => {
                        setLock(false)
                    })
                } else {
                    setLock(true)
                    $.post(`https://${resName}/MoveItemToOther`, JSON.stringify({
                        item: item,
                        count: parseInt(counter.current.value) || 1
                    }), () => {
                        setLock(false)
                    })
                }
            }
        })
    }, [lock, otherInventory])

    // Draggable Item setup (global for .item-img)
    // We use ref logic inside Item component instead if possible, but keeping global for now
    // to match existing architecture, but optimizing events.
    useEffect(() => {
        try {
            if ($('.item-img').data('ui-draggable')) {
                $('.item-img').draggable('destroy');
            }
        } catch(e) {}

        $('.item-img').draggable({
            appendTo: 'body',
            helper: function() {
                const bg = $(this).css('background-image');
                return $('<div class="drag-helper"></div>').css({
                    'background-image': bg,
                    'width': '80px',
                    'height': '80px',
                    'background-size': 'contain',
                    'background-repeat': 'no-repeat',
                    'background-position': 'center',
                    'z-index': 999999,
                    'position': 'absolute',
                    'pointer-events': 'none'
                });
            },
            containment: 'window', // Changed from body to window to prevent scrollbars
            scroll: false, // Disable auto-scroll
            zIndex: 99999, // Higher z-index
            delay: 150, 
            distance: 10,
            cursorAt: { left: 40, top: 40 }, // Centered on cursor (80x80 / 2)
            start: function(e, ui) {    
                selectItem(null)
                setContextMenu(null)
                ui.helper.data('dropped', false);
                // Pass data item to helper so droppable can access it
                ui.helper.data('item', $(this).data('item'));
            },
            stop: function(e, ui) {
                // ... same stop logic ...
                var item = $(this).data('item')

                if (lock) return;

                if (!ui.helper.data('dropped')) {
                    // Logic when dropped nowhere (delete or hotbar remove)
                    // ...
                     if (item.inventory === 'main') {
                        if (counter.current.value < 1) return;
                        if (sound) {
                            clickSound.pause(); clickSound.currentTime = 0; clickSound.play();
                        }
                        // Default behavior: Remove/Drop item?
                        // Original code did RemoveItem here if not dropped on a valid target
                        setLock(true)
                        $.post(`https://${resName}/RemoveItem`, JSON.stringify({
                            item: item,
                            count: parseInt(counter.current.value) || 1
                        }), () => {
                            setLock(false)
                        })
                    } else if (item.inventory === 'hotbar') {
                        // ...
                        $.post(`https://${resName}/RemoveItemFromHotbar`, JSON.stringify({
                            slot: item.slot
                        }))
                    }
                }
            }
        })
    }, [lock, items])

    // Filter Items
    const {favorites} = useInventory()

    const filteredItems = items ? items.filter(item => {
        if (search && search.length > 0) {
            if (!item.label.toLowerCase().includes(search.toLowerCase())) return false;
        }
        if (activeTab === 'weapons') {
            if (item.type !== 'item_weapon') return false;
        } else if (activeTab === 'items') {
            if (item.type === 'item_weapon') return false;
        } else if (activeTab === 'favorites') {
             if (!favorites || !favorites.includes(item.name)) return false;
        }
        return true;
    }) : [];

        const handleItemClick = (e, item) => {
        if (item.inventory === 'main') {
            // Prevent default behavior that might steal focus aggressively
            // e.preventDefault() // <-- REMOVED THIS
            e.stopPropagation()
            e.nativeEvent.stopImmediatePropagation()
            
            if (sound) {
                clickSound.pause()
                clickSound.currentTime = 0;
                clickSound.play()
            }
            selectItem(item)
            
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                item: item
            })
        }
    }

    const handleUse = (item) => {
        $.post(`https://${resName}/UseItem`, JSON.stringify({ item: item }))
        setContextMenu(null)
    }

    const handleGive = (item) => {
        // Trigger Give Mode
        $.post(`https://${resName}/StartGiveItem`, JSON.stringify({ 
            item: item,
            count: parseInt(counter.current.value) 
        }))
        setContextMenu(null)
    }

    // Item component simplified (onItemClick prop removed as handled inside now)
    // ...
    // Note: handleItemClick function inside Inventory component is no longer used by Item prop, 
    // but I moved logic into Item component's handleMouseUp.
    // I should remove handleItemClick from Inventory component to be clean, but it's fine.
    
    // Context Menu render removed from here, moved to App.jsx
    return (
        <div className='inventory' id='inv' style={{overflow: 'visible'}}>
            <div className="items" ref={dropRef} style={{overflow: 'visible'}}>
                {items ? (
                    items.length > 0 ? (
                        filteredItems.length > 0 ? (
                            filteredItems.map((item, index) => (
                                <Item 
                                    key={index}
                                    inventory={type} 
                                    item={item} 
                                    index={index} 
                                />
                            ))
                        ) : (
                            <Animated className='no-items' animationIn="zoomIn" animationOut='fadeOut' animationInDuration={250} animationOutDuration={250}>
                                <span>{locales.NoItemsFound}</span>
                            </Animated>
                        )
                    ) : (
                        <Animated className='no-items' animationIn="zoomIn" animationOut='fadeOut' animationInDuration={250} animationOutDuration={250}>
                            <span>{locales.NoItemsFound}</span>
                        </Animated>
                    )
                ) : (
                    <div className="loader" />
                )}
            </div>
        </div>
    )
}

function Item({inventory, item, index}) {
    const {middleClickUse, locales, sound, clickSound, moveSound, selectedItem, selectItem, setLock, lock, otherInventory, resName, setContextMenu, favorites} = useInventory()



    const itemRef = React.useRef()

    useEffect(() => {
        $(itemRef.current).removeData('item');
        $(itemRef.current).data('item', {inventory, index, ...item});
    }, [inventory, item])

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    const onRightClick = (e, item, otherInv, locked) => {
        e.preventDefault()

        if (!otherInv) return;
        if (!otherInv.items) return;
        if (item.inventory === 'main' && !item.remove) return;
        if (item.inventory === 'shop' || otherInv.type === 'shop') return;
        if (locked) return;

        if (sound) {
            moveSound.pause()
            moveSound.currentTime = 0;
            moveSound.play()
        }

        if (item.inventory !== 'main') {
            setLock(true)
            $.post(`https://${resName}/MoveItemToPlayer`, JSON.stringify({
                item: item,
                count: item.count
            }), () => {
                setLock(false)
            })
        } else {
            setLock(true)
            $.post(`https://${resName}/MoveItemToOther`, JSON.stringify({
                item: item,
                count: item.count
            }), () => {
                setLock(false)
            })
        }
    }

    const handleClick = (e, item) => {
        // Left Click -> Context Menu
        // Check if dragged recently?
        if ($(e.target).closest('.item-img').data('ui-draggable')?.dragging) return;
        
        if (item.inventory === 'main') {
            e.stopPropagation()
            // e.preventDefault() // Not strictly needed for onClick, but good practice if link-like
            
            if (sound) {
                clickSound.pause()
                clickSound.currentTime = 0;
                clickSound.play()
            }
            selectItem(item)
            
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                item: item
            })
        }
    }

    const handleMiddleClick = (e) => {
         if (e.button === 1) {
            e.preventDefault();
            if (!middleClickUse) return;
            if (item.inventory === 'main') {
                if (item.use) {
                    $.post(`https://${resName}/UseItem`, JSON.stringify({
                        item: item
                    }))
                } else {
                    toast("Item is not usable", {type: 'error'})
                }
            }
        }
    }

    const isFavorite = favorites && favorites.includes(item.name)

    return item && (
        <div 
        className={`item ${inventory === "main" && selectedItem && selectedItem.name === item.name && 'selected'} ${inventory === "main" && isFavorite ? 'favorite-item' : ''}`} 
        onContextMenu={(e) => onRightClick(e, {inventory, index, ...item}, otherInventory, lock)}
        onClick={(e) => handleClick(e, {inventory, index, ...item})}
        onMouseDown={(e) => handleMiddleClick(e)} 
        >
            <div className="item-count" style={{width: '100%', textAlign: 'center'}}>
                <Textfit mode='single' max={16}>
                    {inventory === 'shop' || item.type === 'item_account' ? (
                        <span><span style={{color: 'lightgreen', fontWeight: 'bold'}}>{locales.Currency}</span> {numberWithCommas(item.count)}</span>
                    ) : (
                        item.type === 'item_weapon' ? (
                            <span><i className="fas fa-angle-double-up"></i> {numberWithCommas(item.count)}</span>
                        ) : (
                            <span>{numberWithCommas(item.count)}</span>
                        )
                    )}
                </Textfit>
            </div>
            <div className="item-img" ref={itemRef} style={{backgroundImage: `url(../assets/icons/${item.name}.png)`}} />
            <div className="item-name" style={{width: '100%', textAlign: 'center'}}><Textfit mode='single' max={16}>{item.label}</Textfit></div>
            
            {inventory === "main" && isFavorite && (
                <div className="favorite-star">
                    <i className="fas fa-star"></i>
                </div>
            )}
        </div>
    )
}
