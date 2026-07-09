import React, { type FC } from 'react';
import classNames from 'classnames';
import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import type {} from '@mui/material/themeCssVarsAugmentation';

interface StarIconsProps {
    className?: string;
    communityRating: number;
}

const StarIcons: FC<StarIconsProps> = ({ className, communityRating }) => {
    const cssClass = classNames(
        'mediaInfoItem',
        'starRatingContainer',
        className
    );

    return (
        <Box className={cssClass}>
            <StarIcon
                fontSize={'small'}
                // eslint-disable-next-line react/jsx-no-bind
                sx={(theme) => {
                    const palette = theme.vars?.palette || theme.palette;

                    return {
                        color: palette.starIcon?.main || '#f2b01e'
                    };
                }}
            />
            {communityRating.toFixed(1)}
        </Box>
    );
};

export default StarIcons;
