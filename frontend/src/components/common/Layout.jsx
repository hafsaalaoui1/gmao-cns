import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css'; // Contient le style des marges

const Layout = ({ children }) => {
    // État partagé pour le menu rétracté
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="app">
            {/* Passer l'état et le modificateur à la Sidebar */}
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            
            {/* Ajouter la classe 'collapsed' si le menu est réduit */}
            <div className={`main-content ${isCollapsed ? 'collapsed' : ''}`}>
                <Header />
                <div className="content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;