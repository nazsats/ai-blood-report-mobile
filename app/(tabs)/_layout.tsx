// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

// `color` is whatever expo-router hands the tabBarIcon renderer, which since
// RN 0.86 is ColorValue rather than string — it may be an opaque platform
// colour, not just a hex literal. Ionicons accepts the wider type.
function TabIcon({ name, focused, color }: { name: any; focused: boolean; color: ColorValue }) {
    return (
        <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
            <Ionicons name={name} size={22} color={color} />
        </View>
    );
}

const tabStyles = StyleSheet.create({
    iconWrap: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    iconWrapActive: {
        backgroundColor: 'rgba(124,58,237,0.15)',
    },
});

export default function TabsLayout() {
    const C = useColors();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: C.tabBar,
                    borderTopColor: C.tabBarBorder,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    paddingTop: 6,
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                },
                tabBarActiveTintColor: C.primaryLight,
                tabBarInactiveTintColor: C.textDim,
                tabBarLabelStyle: { fontSize: 9, fontWeight: '700', marginTop: 0 },
                tabBarShowLabel: true,
            }}
        >
            {/* Three tabs, in the order someone actually uses the app: take a
                photo, read what it said, manage the account. Everything else
                lives under More in Profile — see the hidden routes below. */}
            <Tabs.Screen
                name="upload"
                options={{
                    title: 'Scan',
                    tabBarIcon: ({ focused, color }) =>
                        <TabIcon name={focused ? 'scan' : 'scan-outline'} focused={focused} color={color} />,
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'Reports',
                    tabBarIcon: ({ focused, color }) =>
                        <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'You',
                    tabBarIcon: ({ focused, color }) =>
                        <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} color={color} />,
                }}
            />

            {/* Hidden, not deleted. `href: null` keeps the route reachable by
                navigation while taking it out of the tab bar, so the habit
                tracker, chat and feed still work for anyone who goes looking
                — they just no longer compete with the one job this app has. */}
            <Tabs.Screen name="home" options={{ href: null }} />
            <Tabs.Screen name="chat" options={{ href: null }} />
            <Tabs.Screen name="feed" options={{ href: null }} />
        </Tabs>
    );
}
