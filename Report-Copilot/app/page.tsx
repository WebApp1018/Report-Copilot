"use client";
import Link from 'next/link';
import { Card, CardContent, CardActions, Button, Grid, Typography, Stack, Box } from '@mui/material';
import BrandIcon from '../components/BrandIcon';
import { useTheme } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  cta?: string;
  highlight?: boolean;
  icon?: React.ElementType;
}

function FeatureCard({ title, description, href, cta = 'Open', highlight, icon: Icon }: FeatureCardProps) {
  const theme = useTheme();
  const cardSx = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    border: `1px solid ${theme.palette.divider}`,
    background: highlight
      ? `linear-gradient(135deg, ${theme.palette.secondary.main}22, ${theme.palette.primary.main}11)`
      : theme.palette.mode === 'light'
        ? 'linear-gradient(180deg,#ffffff,#f9fafb)'
        : 'linear-gradient(180deg,#1e1e1e,#2a2a2a)',
    transition: 'box-shadow .25s, transform .25s, border-color .25s',
    '&:hover': {
      boxShadow: highlight ? 6 : 4,
      transform: 'translateY(-2px)',
      borderColor: highlight ? theme.palette.secondary.main : theme.palette.primary.main,
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  } as const;
  const iconBg = highlight
    ? (theme.palette.mode === 'light' ? `${theme.palette.secondary.main}1A` : `${theme.palette.secondary.main}33`)
    : (theme.palette.mode === 'light' ? `${theme.palette.primary.main}14` : `${theme.palette.primary.main}33`);
  const buttonSx = highlight ? {
    background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
    color: '#fff',
    '&:hover': { background: `linear-gradient(90deg, ${theme.palette.secondary.dark}, ${theme.palette.primary.dark})` }
  } : undefined;
  return (
    <Card elevation={highlight ? 4 : 1} tabIndex={0} sx={cardSx}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          {Icon && (
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%',
              background: iconBg, color: highlight ? theme.palette.secondary.main : theme.palette.primary.main,
            }}>
              <Icon fontSize="small" />
            </Box>
          )}
          <Typography variant="h6" fontWeight={600}>{title}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 2, px: 2 }}>
        <Button component={Link} href={href} variant={highlight ? 'contained' : 'outlined'} size="small" startIcon={Icon ? <Icon fontSize="small" /> : undefined} sx={buttonSx}>{cta}</Button>
      </CardActions>
    </Card>
  );
}

export default function Home() {
  return (
    <Stack spacing={4} sx={{ p: { xs: 3, md: 6 } }}>
      <Stack spacing={1} direction="row" alignItems="center">
        <BrandIcon sx={{ width: 42, height: 42 }} />
        <Typography variant="h4" fontWeight={700}>Report Copilot</Typography>
      </Stack>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard icon={PeopleIcon} title="Customers" description="View all registered customers with location tags." href="/customers" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard icon={Inventory2Icon} title="Products" description="Browse product catalog with categories and pricing." href="/products" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard icon={ReceiptLongIcon} title="Orders" description="Inspect recent orders and status distribution." href="/orders" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FeatureCard icon={EventAvailableIcon} title="Bookings" description="Analyze reservation data and pricing." href="/bookings" />
        </Grid>
        <Grid item xs={12} md={8}>
          <FeatureCard icon={SmartToyIcon} title="AI Report" description="Ask natural language questions; get instant tabular insights and chart suggestions." href="/ai-report" cta="Try it" highlight />
        </Grid>
      </Grid>
    </Stack>
  );
}
