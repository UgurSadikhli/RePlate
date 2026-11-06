import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '@/components/brand-logo';
import { useAppContext } from '@/context/AppContext';
import { ProductItem } from '@/models/Product';
import { formatCurrency } from '@/utils/currency';
import { EXPIRES_SOON_DAYS, getExpirationDays, parseFormattedDate } from '@/utils/date';

const aggregateByExpiration = (products: ProductItem[]) => {
  const filtered = products.filter((p) => !p.toBuy && p.expirationDate);
  const counts = {
    '7 Days': 0,
    '14 Days': 0,
    '30 Days': 0,
  };

  filtered.forEach((p) => {
    const days = getExpirationDays(p.expirationDate);
    if (days === null) return;
    if (days >= 0 && days <= 7) {
      counts['7 Days']++;
    } else if (days > 7 && days <= 14) {
      counts['14 Days']++;
    } else if (days > 14 && days <= 30) {
      counts['30 Days']++;
    }
  });

  return [
    { label: '0–7 Days', count: counts['7 Days'], color: '#FF6B6B' },
    { label: '8–14 Days', count: counts['14 Days'], color: '#FFD700' },
    { label: '15–30 Days', count: counts['30 Days'], color: '#4CAF50' },
  ];
};

function ExpirationTimelineChart({ products }: { products: ProductItem[] }) {
  const hasUpcoming = products.some((p) => {
    if (p.toBuy || !p.expirationDate) return false;
    const days = getExpirationDays(p.expirationDate);
    return days !== null && days >= 0;
  });

  if (!hasUpcoming) return null;

  const data = aggregateByExpiration(products);
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeaderRow}>
        <Ionicons name="calendar-outline" size={18} color="#4CAF50" />
        <Text style={styles.chartTitle}>Expiration Timeline</Text>
      </View>
      <View style={styles.barChartWrapper}>
        {data.map((item, index) => (
          <View key={index} style={styles.barContainer}>
            <Text style={styles.barLabel}>{item.label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.barCount}>{item.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MonthlyConsumptionTracker({
  monthlyConsumption,
}: {
  monthlyConsumption: { thisMonth: number; lastMonth: number };
}) {
  const { thisMonth, lastMonth } = monthlyConsumption;
  const difference = thisMonth - lastMonth;
  const isHigher = difference > 0;
  const isSame = difference === 0;

  let icon: keyof typeof Ionicons.glyphMap;
  let comparisonText: string;
  let accentColor: string;
  let badgeBg: string;

  if (isSame) {
    icon = 'remove-circle-outline';
    comparisonText = 'Same purchase count as last month.';
    accentColor = '#999999';
    badgeBg = 'rgba(255, 255, 255, 0.05)';
  } else if (isHigher) {
    icon = 'trending-up-outline';
    comparisonText = `${difference} more item${difference === 1 ? '' : 's'} tracked than last month!`;
    accentColor = '#4CAF50';
    badgeBg = 'rgba(76, 175, 80, 0.12)';
  } else {
    icon = 'trending-down-outline';
    comparisonText = `${Math.abs(difference)} fewer item${Math.abs(difference) === 1 ? '' : 's'} than last month.`;
    accentColor = '#FFD700';
    badgeBg = 'rgba(255, 215, 0, 0.12)';
  }

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeaderRow}>
        <Ionicons name="stats-chart-outline" size={18} color="#4CAF50" />
        <Text style={styles.chartTitle}>Monthly Purchase Rate</Text>
      </View>
      <View style={styles.consumptionStats}>
        <View style={styles.consumptionItem}>
          <Text style={styles.consumptionValue}>{thisMonth}</Text>
          <Text style={styles.consumptionLabel}>This Month</Text>
        </View>
        <View style={styles.consumptionDivider} />
        <View style={styles.consumptionItem}>
          <Text style={[styles.consumptionValue, { color: '#EAEAEA' }]}>{lastMonth}</Text>
          <Text style={styles.consumptionLabel}>Last Month</Text>
        </View>
      </View>
      <View style={[styles.comparisonBar, { backgroundColor: badgeBg, borderColor: accentColor + '40' }]}>
        <Ionicons name={icon} size={18} color={accentColor} style={{ marginRight: 8 }} />
        <Text style={[styles.comparisonText, { color: accentColor }]}>{comparisonText}</Text>
      </View>
    </View>
  );
}

function MonthlySpendingTracker({
  monthlySpending,
  currency,
}: {
  monthlySpending: { thisMonth: number; lastMonth: number };
  currency: string;
}) {
  const thisMonth = Number(monthlySpending.thisMonth) || 0;
  const lastMonth = Number(monthlySpending.lastMonth) || 0;
  const diff = thisMonth - lastMonth;
  const isHigher = diff > 0;

  let icon: keyof typeof Ionicons.glyphMap;
  let comparisonText: string;
  let accentColor: string;
  let badgeBg: string;

  if (diff === 0) {
    icon = 'remove-circle-outline';
    comparisonText = 'Spending is the same as last month.';
    accentColor = '#999999';
    badgeBg = 'rgba(255, 255, 255, 0.05)';
  } else if (isHigher) {
    icon = 'trending-up-outline';
    comparisonText = `Up ${formatCurrency(diff, currency)} from last month.`;
    accentColor = '#FF6B6B';
    badgeBg = 'rgba(255, 107, 107, 0.12)';
  } else {
    icon = 'trending-down-outline';
    comparisonText = `Down ${formatCurrency(Math.abs(diff), currency)} from last month. Nice saving!`;
    accentColor = '#4CAF50';
    badgeBg = 'rgba(76, 175, 80, 0.12)';
  }

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeaderRow}>
        <Ionicons name="wallet-outline" size={18} color="#00BCD4" />
        <Text style={styles.chartTitle}>Monthly Spending</Text>
      </View>
      <View style={styles.consumptionStats}>
        <View style={styles.consumptionItem}>
          <Text style={[styles.consumptionValue, { color: '#00BCD4' }]}>
            {formatCurrency(thisMonth, currency)}
          </Text>
          <Text style={styles.consumptionLabel}>Spent This Month</Text>
        </View>
        <View style={styles.consumptionDivider} />
        <View style={styles.consumptionItem}>
          <Text style={[styles.consumptionValue, { color: '#EAEAEA' }]}>
            {formatCurrency(lastMonth, currency)}
          </Text>
          <Text style={styles.consumptionLabel}>Spent Last Month</Text>
        </View>
      </View>
      <View style={[styles.comparisonBar, { backgroundColor: badgeBg, borderColor: accentColor + '40' }]}>
        <Ionicons name={icon} size={18} color={accentColor} style={{ marginRight: 8 }} />
        <Text style={[styles.comparisonText, { color: accentColor }]}>{comparisonText}</Text>
      </View>
    </View>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardTop}>
        <View style={[styles.statIconWrap, { backgroundColor: color + '1A' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { products, settings } = useAppContext();
  const currentYear = new Date().getFullYear();

  const { stats, monthlyConsumption, monthlySpending } = useMemo(() => {
    const now = new Date();
    const lastMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const acquiredProducts = products.filter((p) => !p.toBuy && !p.inProgress && p.boughtDate);

    const thisMonthProducts = acquiredProducts.filter((p) => {
      const d = parseFormattedDate(p.boughtDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const lastMonthProducts = acquiredProducts.filter((p) => {
      const d = parseFormattedDate(p.boughtDate);
      return d.getMonth() === lastMonthIdx && d.getFullYear() === lastMonthYear;
    });

    const sumSpending = (list: ProductItem[]) =>
      list.reduce((sum, p) => {
        const cleanPrice = String(p.price ?? 0).replace(',', '.');
        return sum + (parseFloat(cleanPrice) || 0);
      }, 0);

    const total = products.length;
    const toBuy = products.filter((p) => p.toBuy).length;
    const inProgress = products.filter((p) => p.inProgress).length;
    const expiresSoon = products.filter((p) => {
      if (p.toBuy || !p.expirationDate) return false;
      const days = getExpirationDays(p.expirationDate);
      return days !== null && days <= EXPIRES_SOON_DAYS;
    }).length;

    return {
      stats: { total, toBuy, expiresSoon, inProgress },
      monthlyConsumption: {
        thisMonth: thisMonthProducts.length,
        lastMonth: lastMonthProducts.length,
      },
      monthlySpending: {
        thisMonth: sumSpending(thisMonthProducts),
        lastMonth: sumSpending(lastMonthProducts),
      },
    };
  }, [products]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Clean Minimal Top Bar */}
        <View style={styles.topBar}>
          <BrandLogo size="md" />
          <TouchableOpacity
            style={styles.settingsIconBtn}
            onPress={() => router.push('/pages/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color="#EAEAEA" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Dashboard</Text>
          <Text style={styles.heroSubtitle}>Track your inventory and reduce food waste</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard title="Total Foods" value={stats.total} icon="nutrition-outline" color="#4CAF50" />
          <StatCard title="To Buy" value={stats.toBuy} icon="cart-outline" color="#00BCD4" />
          <StatCard title="Expires Soon" value={stats.expiresSoon} icon="time-outline" color="#FF6B6B" />
          <StatCard title="In Progress" value={stats.inProgress} icon="hourglass-outline" color="#FFD700" />
        </View>

        <MonthlySpendingTracker monthlySpending={monthlySpending} currency={settings.currency} />

        <MonthlyConsumptionTracker monthlyConsumption={monthlyConsumption} />

        <ExpirationTimelineChart products={products} />

        {/* Dark Cohesive Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.footerTopRow}>
            <View style={styles.logoSection}>
              <BrandLogo size="sm" />
              <Text style={styles.copyrightText}>© {currentYear} RePlate. All rights reserved.</Text>
            </View>
          </View>

          <View style={styles.footerDivider} />

          <View style={styles.footerLinksGrid}>
            <View style={styles.linkColumn}>
              <Text style={styles.columnHeader}>Company</Text>
              <TouchableOpacity onPress={() => router.push('/pages/aboutus')}>
                <Text style={styles.linkText}>About Us</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/pages/privacy')}>
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/pages/termsofservice')}>
                <Text style={styles.linkText}>Terms of Service</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.linkColumn}>
              <Text style={styles.columnHeader}>Support</Text>
              <TouchableOpacity onPress={() => router.push('/pages/howtouse')}>
                <Text style={styles.linkText}>How to Use</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/pages/settings')}>
                <Text style={styles.linkText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/pages/contactus')}>
                <Text style={styles.linkText}>Contact Us</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    marginTop: 6,
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#111111',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
  },

  chartContainer: {
    marginTop: 14,
    backgroundColor: '#111111',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  consumptionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  consumptionItem: {
    alignItems: 'center',
    flex: 1,
  },
  consumptionValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4CAF50',
  },
  consumptionLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
    fontWeight: '500',
  },
  consumptionDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#222222',
  },
  comparisonBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  comparisonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  barChartWrapper: { paddingVertical: 4 },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: {
    width: 85,
    fontSize: 13,
    color: '#BBBBBB',
    marginRight: 10,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barCount: {
    width: 30,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  footerContainer: {
    backgroundColor: '#0B0B0B',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    marginTop: 28,
  },
  footerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    gap: 6,
  },
  copyrightText: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#1A1A1A',
    marginVertical: 16,
  },
  footerLinksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkColumn: {
    flex: 1,
    gap: 8,
  },
  columnHeader: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkText: {
    color: '#999999',
    fontSize: 14,
    paddingVertical: 2,
  },
});
