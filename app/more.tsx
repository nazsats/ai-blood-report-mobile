// app/more.tsx — everything that is not reading a blood report.
//
// These features all work and several are genuinely good, but each one on the
// home screen was another thing to read past before starting the one task the
// app is named for. They live here now: one tap away for anyone who wants them,
// out of the way of everyone who doesn't.

import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../constants/colors';
import { FONTS } from '../constants/fonts';

type Item = {
    href: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    blurb: string;
};

const GROUPS: { heading: string; items: Item[] }[] = [
    {
        heading: 'Food and fitness',
        items: [
            { href: '/meal-scan',      icon: 'restaurant-outline', title: 'Meal scanner',  blurb: 'Photograph a meal for its nutrition' },
            { href: '/fitness',        icon: 'walk-outline',       title: 'Fitness',       blurb: 'Steps and daily activity' },
            { href: '/weight-tracker', icon: 'trending-up-outline',title: 'Weight',        blurb: 'Track weight over time' },
            { href: '/calculators',    icon: 'calculator-outline', title: 'Calculators',   blurb: 'BMI, body fat, calorie needs' },
        ],
    },
    {
        heading: 'More from Plainly',
        items: [
            { href: '/ai-chat',      icon: 'chatbubbles-outline', title: 'Health chat', blurb: 'Ask questions about your results' },
            { href: '/(tabs)/home',  icon: 'grid-outline',        title: 'Dashboard',   blurb: 'Habits, air quality, daily summary' },
            { href: '/(tabs)/feed',  icon: 'people-outline',      title: 'Community',   blurb: 'Posts from other people' },
        ],
    },
];

export default function MoreScreen() {
    const C = useColors();
    const router = useRouter();

    return (
        <View style={[st.screen, { backgroundColor: C.bg }]}>
            <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                    style={st.back}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={21} color={C.primary} />
                    <Text style={[st.backTxt, { color: C.primary }]}>Back</Text>
                </TouchableOpacity>

                <Text style={[st.h1, { color: C.textPrimary }]}>More</Text>
                <Text style={[st.sub, { color: C.textMuted }]}>
                    Everything else Plainly can do.
                </Text>

                {GROUPS.map((group) => (
                    <View key={group.heading} style={st.group}>
                        <Text style={[st.groupHead, { color: C.primary }]}>{group.heading}</Text>

                        <View style={[st.card, { backgroundColor: C.bgCard, borderColor: C.borderLight }]}>
                            {group.items.map((item, i) => (
                                <TouchableOpacity
                                    key={item.href}
                                    style={[
                                        st.row,
                                        i < group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight },
                                    ]}
                                    onPress={() => router.push(item.href as never)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[st.iconWrap, { backgroundColor: C.primaryMuted }]}>
                                        <Ionicons name={item.icon} size={18} color={C.primary} />
                                    </View>
                                    <View style={st.grow}>
                                        <Text style={[st.rowTitle, { color: C.textPrimary }]}>{item.title}</Text>
                                        <Text style={[st.rowBlurb, { color: C.textMuted }]}>{item.blurb}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={17} color={C.textDim} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    screen: { flex: 1 },
    scroll: { padding: 22, paddingTop: 58, paddingBottom: 48 },
    grow: { flex: 1 },

    back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 22 },
    backTxt: { fontFamily: FONTS.bodyBold, fontSize: 15 },

    h1: { fontFamily: FONTS.display, fontSize: 30, letterSpacing: -0.8 },
    sub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 6, marginBottom: 8 },

    group: { marginTop: 26 },
    groupHead: {
        fontFamily: FONTS.title, fontSize: 12.5, letterSpacing: 0.4,
        textTransform: 'uppercase', marginBottom: 11, marginLeft: 3,
    },

    card: { borderRadius: 19, borderWidth: 1, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16 },
    iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontFamily: FONTS.bodyBold, fontSize: 14.5 },
    rowBlurb: { fontFamily: FONTS.body, fontSize: 12.5, marginTop: 2 },
});
