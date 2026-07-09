import React from 'react';
import { Outlet } from 'react-router-dom';

import AppBody from 'components/AppBody';
import CustomCss from 'components/CustomCss';
import MuiThemeProvider from 'components/MuiThemeProvider';
import ThemeCss from 'components/ThemeCss';

export default function AppLayout() {
    return (
        <MuiThemeProvider>
            <AppBody>
                <Outlet />
            </AppBody>
            <ThemeCss />
            <CustomCss />
        </MuiThemeProvider>
    );
}
