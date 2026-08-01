import React, { useEffect, useState } from 'react'
import $ from 'jquery'
import { ToastContainer, Flip, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {CSSTransition} from 'react-transition-group'
import {Animated} from 'react-animated-css'
import Inventory from './Inventory.jsx'
// import Actions from './Actions.jsx'  <-- Deleted
import Hotbar from './Hotbar.jsx';

const InventoryContext = React.createContext()

export function useInventory() {
    return React.useContext(InventoryContext)
}

// Extract Inventory Container to a reusable component
const InventoryContainer = ({ inventoryData, title, isOther }) => {
    const { 
        counter, lastValue, handleAmountChange, 
        search, setSearch, 
        activeTab, setActiveTab 
    } = useInventory();

    // Parse Title: If it's HTML (like <b>Plate</b>), we strip it or handle it.
    // Usually title is "Glovebox - <b>PLATE</b>" or just "Glovebox".
    // User wants: LUNAR [TITLE]
    
    let displayTitle = "INVENTORY"; // Default
    if (isOther && inventoryData.title) {
        // Remove HTML tags for clean display if needed, or keep them.
        // But user specifically asked for "LUNAR" brand and then the type.
        // Example: "Glovebox - <b>ABC</b>" -> "HANDSCHUHFACH" (if we can map it) or just show the title.
        // Since we don't have a map for every type, we might use the title provided by Lua but styled.
        
        // Simple approach: Use the title from Lua, but uppercase and styled.
        // However, the Lua title often contains "Glovebox - ...".
        // Let's just render what Lua sends, but styled with LUNAR prefix.
            displayTitle = inventoryData.title.replace(/<\/?[^>]+(>|$)/g, "").toUpperCase(); // Strip HTML tags
    } else {
            displayTitle = "INVENTORY";
    }

    return (
        <div className="strada-container">
            <div className="strada-header">
                <div className="logo">
                    <i className="fas fa-box-open"></i> 
                    <div className="logo-text-group">
                        <span className="logo-brand">LUNAR</span>
                        <span className="logo-subtitle">
                            {displayTitle}
                        </span>
                    </div>
                </div>
                
                {inventoryData && inventoryData.weight && (
                    <div className="weight-bar-container">
                        <div className="weight-text">
                            {(inventoryData.weight.current || 0).toFixed(1)} / {(inventoryData.weight.max || 0).toFixed(0)} KG
                        </div>
                        <div className="weight-bar-outer">
                            <div 
                                className="weight-bar-inner" 
                                style={{width: Math.min(((inventoryData.weight.current || 0) / (inventoryData.weight.max || 1)) * 100, 100) + '%'}} 
                            />
                        </div>
                    </div>
                )}

                <div className="header-controls">
                    <input 
                        type="text" // Changed from number to text to prevent some browser specific re-formatting on re-render
                        className="amount-input" 
                        ref={counter} 
                        placeholder="1"
                        onChange={handleAmountChange}
                        value={lastValue}
                        onMouseDown={(e) => e.stopPropagation()} 
                        onFocus={(e) => e.target.select()} // Auto-select on click for easier editing
                    />
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input 
                            type="text" 
                            placeholder="Suchen..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                        />
                    </div>
                </div>
            </div>

            <div className="strada-content">
                    <div className="inventory-grid-wrapper">
                    {inventoryData && <Inventory type={inventoryData.type} title={inventoryData.title} weight={inventoryData.weight} items={inventoryData.items}  />}
                    </div>
            </div>

            <div className="strada-footer">
                <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>
                    <i className="fas fa-th"></i> Alles
                </button>
                <button className={activeTab === 'items' ? 'active' : ''} onClick={() => setActiveTab('items')}>
                    <i className="fas fa-box"></i> Items
                </button>
                <button className={activeTab === 'weapons' ? 'active' : ''} onClick={() => setActiveTab('weapons')}>
                    <i className="fas fa-gun"></i> Waffen
                </button>
                <button className={activeTab === 'favorites' ? 'active' : ''} onClick={() => setActiveTab('favorites')}>
                    <i className="fas fa-star"></i> Favoriten
                </button>
            </div>
        </div>
    )
}

export default function App() {
    const [open, setOpen] = useState(false)

    // Data
    const [inventory, setInventory] = useState(null)
    const [otherInventory, setOtherInventory] = useState(null)
    const [hotbar, setHotbar] = useState(null)
    const [hotbarTab, setHotbarTab] = useState(false)
    const [players, setPlayers] = useState(null)
    const [sound, setSound] = useState(true)
    const counter = React.useRef()
    const [lastValue, setLastValue] = useState("1") // Initialize as string to avoid type conflicts
    const [selectedItem, selectItem] = useState(null)
    const [lock, setLock] = useState(false)
    const [resName, setResName] = useState('inventory')
    const [clickOutside, setClickOutside] = useState(false)
    const [middleClickUse, setMiddleClickUse] = useState(false)
    const [locales, setLocales] = useState({
        Currency: "$",
        NoItemsFound: "😢 No Item's Found",
        Give: "Give",
        Use: "Use",
        NoPlayersFound: "😢 No Player's Found"
    })

    useEffect(() => {
       // Clean up logic
    }, [selectedItem, inventory, otherInventory]) 

    const handleAmountChange = (e) => {
        // Just update state, don't force focus here, let the input handle itself naturally
        // as we are now fully controlled.
        const val = e.target.value;
        setLastValue(val);
    }

    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState('all')

    var timer = null

    // sounds
    const clickSound = document.createElement('audio')
    clickSound.src = '../assets/sounds/click.wav'
    clickSound.volume = .1

    const moveSound = document.createElement('audio')
    moveSound.src = '../assets/sounds/move.wav'
    moveSound.volume = .1

    const onLaunch = (e) => {
        var data = e.data
        switch (data.action) {
            case 'open':
                setLock(false)
                selectItem(null)
                setPlayers(data.players)
                setHotbar(data.hotbar)
                setHotbarTab(false)
                setSound(data.sound)
                setResName(data.invName)
                setLocales(data.locales)
                setClickOutside(data.clickOutside)
                setMiddleClickUse(data.middleClickUse)
                setInventory(data.inventory)
                setOtherInventory(data.otherInventory)
                setOpen(true)
                break;
            case 'setItems':
                setHotbar(data.hotbar)
                setInventory(inv => ({...inv, items: data.items, weight: data.weight}))
                break;
            case 'setOtherItems':
                setOtherInventory(inv => ({...inv, items: data.items, weight: data.weight}))
                break;
            case 'showHotbar':
                clearTimeout(timer)
                setHotbarTab(data.hotbar)
                timer = setTimeout(() => {
                    $('.hotbar-wrapper').fadeOut(250, () => {
                        $.post(`https://${data.invName}/UnlockHotbar`)
                        setHotbarTab(false)
                    })
                }, data.timeout)
                break;
            case 'close':
                CloseInventory(data.invName)
                break;
            case 'notify':
                toast((<span dangerouslySetInnerHTML={{__html: data.msg}} />), {type: data.type})
                break;
        }
    }

    const onMouseDown = (e) => {
        if (e.button === 0) {
            // Check if context menu exists and if we clicked inside it
            if (contextMenu && e.target.closest('.context-menu')) {
                return;
            }

            // Check if we clicked on an interactive element (input, button, etc) inside the inventory
            if (e.target.closest('input') || e.target.closest('button') || e.target.closest('.search-box')) {
                return;
            }

            if (!e.target.closest('#actions')  && !e.target.closest('#inv') && !e.target.closest('#hotbar')) {
                if (clickOutside) {
                    CloseInventory(resName)
                }
                return;
            }
            
            // If clicking anywhere else in the inventory that isn't an input, we might want to defocus inputs
            // but we should NOT reset the counter if we just click an item.
            // The issue description says: "when typing in amount, and then click item, it deselects" 
            // - Wait, if you click an item, the input loses focus naturally because you clicked something else.
            // But the user says "man kann keine zahl mehr eingeben". 
            // This usually happens if the input is re-rendered or disabled.
            // OR if `selectItem` causes a re-render that messes up the input focus.
            // Since we made the input controlled with `lastValue`, it should persist the value.
            // But focus might be lost.
        }
    }

    const onKeyUp = (e) => {
        if (e.key === "Escape") {
            CloseInventory(resName)
        }
    }

    const [contextMenu, setContextMenu] = useState(null)

    const CloseInventory = (name) => {
        if (counter.current) setLastValue(counter.current.value)
        $.post(`https://${name}/close`)
        setOpen(false)
        setContextMenu(null)
    }

    useEffect(() => {
        const closeMenu = (e) => {
            if (contextMenu) setContextMenu(null)
        }
        window.addEventListener("click", closeMenu)
        return () => window.removeEventListener("click", closeMenu)
    }, [contextMenu])

    useEffect(() => {
        window.addEventListener('message', onLaunch)
        return () => {
            window.removeEventListener('message', onLaunch);
        };
    }, [])

    useEffect(() => {
        window.addEventListener('keyup', onKeyUp)
        window.addEventListener('mousedown', onMouseDown)
        return () => {
            window.removeEventListener('keyup', onKeyUp)
            window.removeEventListener('mousedown', onMouseDown)
        };
    }, [resName, clickOutside])

    const handleUse = (item) => {
        if (item.use) {
            $.post(`https://${resName}/UseItem`, JSON.stringify({ item: item }))
            setContextMenu(null)
        } else {
            // Check if it's a weapon, weapons are always usable/equippable in this context usually
            if (item.type === 'item_weapon') {
                 $.post(`https://${resName}/UseItem`, JSON.stringify({ item: item }))
                 setContextMenu(null)
                 return;
            }
            toast("Das Item ist nicht benutzbar!", {type: 'error'})
        }
    }

    const handleGive = (item) => {
        $.post(`https://${resName}/StartGiveItem`, JSON.stringify({ 
            item: item,
            count: parseInt(counter.current.value) 
        }))
        setContextMenu(null)
    }

    const handlePack = (item) => {
        $.post(`https://${resName}/PackWeapon`, JSON.stringify({ item: item }))
        setContextMenu(null)
    }

    const handleFavorite = (item) => {
        // We can't persist this on server easily without modifying DB/ESX heavily.
        // So we store it in LocalStorage for now based on item name.
        let favs = JSON.parse(localStorage.getItem('strada_favs') || '[]')
        
        if (favs.includes(item.name)) {
            favs = favs.filter(i => i !== item.name)
        } else {
            favs.push(item.name)
        }
        
        localStorage.setItem('strada_favs', JSON.stringify(favs))
        
        // Force update UI (simple hack by toggling a dummy state or just re-setting inventory if we could)
        // Better: Context should expose a list of favorites
        setFavorites(favs)
        setContextMenu(null)
    }

    const [favorites, setFavorites] = useState([])

    const isPackableItem = (item) => {
        if (!item) return false

        const itemName = String(item.name || '').toUpperCase()
        return item.type === 'item_weapon' || itemName.startsWith('WEAPON_')
    }

    useEffect(() => {
        const favs = JSON.parse(localStorage.getItem('strada_favs') || '[]')
        setFavorites(favs)
    }, [])



    return (
        <InventoryContext.Provider value={{
            inventory, setInventory, setPlayers, locales, middleClickUse, sound, resName, clickSound, moveSound, setLock, lock, selectedItem, selectItem, 
            counter, otherInventory, search, setSearch, activeTab, setActiveTab, contextMenu, setContextMenu, favorites,
            lastValue, handleAmountChange
        }}>
            <CSSTransition in={open} timeout={200} classNames="app" unmountOnExit>
                <div className='app'>
                    <div className="dual-inventory-wrapper" style={{
                        display: 'flex', 
                        gap: '20px', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '100vh',
                        width: '100vw'
                    }}>
                        {/* Player Inventory */}
                        <InventoryContainer inventoryData={inventory} isOther={false} />
                        
                        {/* Other Inventory (if exists) */}
                        {otherInventory && (
                             <InventoryContainer inventoryData={otherInventory} title={otherInventory.title} isOther={true} />
                        )
                        }
                    </div>

                    {/* Context Menu Rendered Globaly */}
                    {contextMenu && (
                        <div 
                            className="context-menu" 
                            style={{
                                top: contextMenu.y, 
                                left: contextMenu.x,
                                position: 'fixed', 
                                zIndex: 99999 
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()} 
                        >
                            <div className="menu-option menu-option-use" onClick={(e) => { e.stopPropagation(); handleUse(contextMenu.item); }}>
                                <i className="fas fa-hand-pointer"></i> {locales.Use}
                            </div>
                            <div className="menu-option menu-option-give" onClick={(e) => { e.stopPropagation(); handleGive(contextMenu.item); }}>
                                <i className="fas fa-gift"></i> {locales.Give}
                            </div>
                            {isPackableItem(contextMenu.item) && (
                                <div className="menu-option menu-option-pack" onClick={(e) => { e.stopPropagation(); handlePack(contextMenu.item); }}>
                                    <i className="fas fa-archive"></i> Einpacken
                                </div>
                            )}
                            <div className="menu-option menu-option-favorite" onClick={(e) => { e.stopPropagation(); handleFavorite(contextMenu.item); }}>
                                <i className="fas fa-star" style={{color: favorites.includes(contextMenu.item.name) ? 'gold' : 'white'}}></i> {favorites.includes(contextMenu.item.name) ? 'Entfavorisieren' : 'Favorisieren'}
                            </div>
                        </div>
                    )}
                    
                    {hotbar && (
                        <Hotbar toggle={true} slotCount={hotbar.slotCount} items={hotbar.items} />
                    )}
                </div>
            </CSSTransition>
            <ToastContainer pauseOnFocusLoss={false} closeButton={false} newestOnTop pauseOnHover={false} transition={Flip} limit={otherInventory ? 4 : 8} />
            {hotbarTab && (
                <Animated animationIn='fadeIn' animationInDuration={250}>
                    <div className='hotbar-wrapper'>
                        <Hotbar slotCount={hotbarTab.slotCount} items={hotbarTab.items} />
                    </div>
                </Animated>
            )}
        </InventoryContext.Provider>
    )
}
