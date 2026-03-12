// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

function TabIcon({ name, focused, color }: { name: any; focused: boolean; color: string }) {
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
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ focused, color }) =>
                        <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />,
                }}
            />
            {/* 2 — Analyze Hub (Blood Report + Meal Scanner + Calculators) */}
            <Tabs.Screen
                name="upload"
                options={{
                    title: 'Analyze',
                    tabBarIcon: ({ focused, color }) =>
                        <TabIcon name={focused ? 'scan' : 'scan-outline'} focused={focused} color={color} />,
                }}
            />

            {/* 3 — AI Health Chat */}
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'AI Chat',
                    tabBarIcon: ({ focused, color }) =>
                        <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} color={color} />,
                }}
            />

            {/* 4 — Reports History */}
            <Tabs.Screen
                name="history"
                options={{
                    title: 'Reports',
                    tabBarIcon: ({ focused, color }) =>
                        <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} color={color} />,
                }}
            />

            {/* 5 — Profile & Settings */}
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused, color }) =>
                        <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} color={color} />,
                }}
            />

            {/* Feed hidden from tab bar — accessible from home page */}
            <Tabs.Screen
                name="feed"
                options={{ href: null }}
            />
        </Tabs>
    );
}
