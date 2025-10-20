"use client";
import React from 'react';
import { Stack, Typography, TextField, IconButton, Chip, Box, InputAdornment, Tooltip } from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import SearchIcon from '@mui/icons-material/Search';

export interface PageHeaderProps {
    icon?: React.ElementType;
    title: string;
    searchPlaceholder?: string;
    onSearch?: (value: string) => void;
    onToggleSort?: () => void;
    sortOrder?: 'asc' | 'desc';
    badge?: string;
    dense?: boolean;
    disabledSearch?: boolean;
    actionsRight?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, searchPlaceholder = 'Search', onSearch, onToggleSort, sortOrder, badge, dense, disabledSearch, actionsRight }: PageHeaderProps) {
    return (
        <Box
            sx={(t) => ({
                borderRadius: 3,
                px: 2,
                py: dense ? 1.25 : 1.75,
                display: 'flex',
                flexDirection: 'column',
                gap: 12 / 8,
                background: t.palette.mode === 'light'
                    ? 'linear-gradient(135deg,#ffffff,#f4f7fb)'
                    : 'linear-gradient(135deg,#1f1f1f,#272a2e)',
                border: `1px solid ${t.palette.divider}`,
                boxShadow: t.palette.mode === 'light' ? '0 2px 6px rgba(0,0,0,0.05)' : '0 2px 6px rgba(0,0,0,0.6)',
            })}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1.2}>
                    {Icon && (
                        <Box
                            sx={(t) => ({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: t.palette.mode === 'light' ? `${t.palette.primary.main}0D` : `${t.palette.primary.main}33`,
                                color: t.palette.primary.main,
                            })}
                        >
                            <Icon fontSize="small" />
                        </Box>
                    )}
                    <Typography variant={dense ? 'h6' : 'h5'} fontWeight={600}>{title}</Typography>
                    {badge && <Chip label={badge} size="small" />}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    {onSearch && (
                        <TextField
                            size="small"
                            placeholder={searchPlaceholder}
                            onChange={(e) => onSearch(e.target.value)}
                            disabled={disabledSearch}
                            sx={{ minWidth: 200 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    )}
                    {onToggleSort && (
                        <Tooltip title={`Toggle sort (${sortOrder || 'desc'})`}>
                            <IconButton size="small" onClick={onToggleSort}>
                                <SortIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {actionsRight}
                </Stack>
            </Stack>
        </Box>
    );
}

export default PageHeader;
