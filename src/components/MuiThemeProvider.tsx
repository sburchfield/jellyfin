import { ThemeProvider } from '@mui/material/styles';
import React, { type FC, type PropsWithChildren } from 'react';

import appTheme from 'themes/themes';
import { ThemeStorageManager } from 'themes/themeStorageManager';

const MuiThemeProvider: FC<PropsWithChildren> = ({ children }) => (
    <ThemeProvider
        theme={appTheme}
        defaultMode='dark'
        storageManager={ThemeStorageManager}
    >
        {children}
    </ThemeProvider>
);

export default MuiThemeProvider;
