import React from 'react';
import {createRoot} from 'react-dom/client';
import Game from './Game';
import './Game.css';
import './DuelLinksTheme.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Game/></React.StrictMode>);
