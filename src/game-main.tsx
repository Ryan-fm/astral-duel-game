import React from 'react';
import {createRoot} from 'react-dom/client';
import GameEntry from './GameEntry';
import './Game.css';
import './DuelLinksTheme.css';
import './BattleFocus.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><GameEntry/></React.StrictMode>);
