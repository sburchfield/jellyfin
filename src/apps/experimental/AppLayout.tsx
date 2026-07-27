import React, { StrictMode, useCallback, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import { type Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Outlet, useLocation } from 'react-router-dom';

import AppBody from 'components/AppBody';
import CustomCss from 'components/CustomCss';
import ElevationScroll from 'components/ElevationScroll';
import MuiThemeProvider from 'components/MuiThemeProvider';
import ThemeCss from 'components/ThemeCss';
import { useApi } from 'hooks/useApi';

import AppToolbar from './components/AppToolbar';
import AppDrawer, { isDrawerPath } from './components/drawers/AppDrawer';

import './AppOverrides.scss';

const ExperimentalAppLayout = () => {
    const [ isDrawerActive, setIsDrawerActive ] = useState(false);
    const { user } = useApi();
    const location = useLocation();

    const isMediumScreen = useMediaQuery((t: Theme) => t.breakpoints.up('md'));
    const isDrawerAvailable = isDrawerPath(location.pathname) && Boolean(user) && !isMediumScreen;
    const isDrawerOpen = isDrawerActive && isDrawerAvailable;

    const onToggleDrawer = useCallback(() => {
        setIsDrawerActive(!isDrawerActive);
    }, [ isDrawerActive, setIsDrawerActive ]);

    return (
        <>
            <Box sx={{ position: 'relative', display: 'flex', height: '100%' }}>
                <StrictMode>
                    <ElevationScroll elevate={false}>
                        <AppBar
                            position='fixed'
                            sx={{
                                width: '100%',
                                ml: 0
                            }}
                        >
                            <AppToolbar
                                isDrawerAvailable={!isMediumScreen && isDrawerAvailable}
                                isDrawerOpen={isDrawerOpen}
                                onDrawerButtonClick={onToggleDrawer}
                            />
                        </AppBar>
                    </ElevationScroll>

                    {
                        isDrawerAvailable && (
                            <AppDrawer
                                open={isDrawerOpen}
                                onClose={onToggleDrawer}
                                onOpen={onToggleDrawer}
                            />
                        )
                    }
                </StrictMode>

                <Box
                    component='main'
                    sx={{
                        width: '100%',
                        flexGrow: 1
                    }}
                >
                    <AppBody>
                        <Outlet />
                    </AppBody>
                </Box>
            </Box>
            <ThemeCss />
            <CustomCss />
        </>
    );
};

/**
 * Keep MUI off the stable startup path while ensuring the experimental layout
 * hooks run inside the provider.
 */
export const Component = () => (
    <MuiThemeProvider>
        <ExperimentalAppLayout />
    </MuiThemeProvider>
);
