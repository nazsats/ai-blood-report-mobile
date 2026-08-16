// app/more.tsx — everything that is not reading a blood report.
//
// Meal scanning and fitness are built and working, but they are not what this
// app is for yet, and shipping them half-promoted invites reviews about the
// wrong thing. They sit here marked Coming soon: visible enough to signal
// direction, closed enough that nobody judges the app on them.

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../constants/colors';
import { FONTS } from '../constants/fonts';

type Item = {
    href?: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    blurb: string;
    soon?: boolean;
};

const ITEMS: Item[] = [
    { href: '/ai-chat',     icon: 'chatbubbles-outline', title: 'Health chat', blurb: 'Ask anything about your results' },
    { href: '/calculators', icon: 'calculator-outline',  title: 'Calculators', blurb: 'BMI, body fat, calorie needs' },
    { icon: 'restaurant-outline', title: 'Meal scanner', blurb: 'Photograph a meal for its nutrition', soon: true },
    { icon: 'walk-outline',       title: 'Fitness',      blurb: 'Steps and daily activity',            soon: true },
    { icon: 'trending-up-outline',title: 'Weight',       blurb: 'Track your weight over time',         soon: true },
];

export default function MoreScreen() {
    const C = useColors();
    const router = useRouter();

    const open = (item: Item) => {
        if (item.soon || !item.href) {
            Alert.alert(item.title, 'This one is on the way. For now, Plainly focuses on reading your blood reports.');
            return;
        }
        router.push(item.href as never);
    };

    return (
        <View style={[st.screen, { backgroundColor: C.bg }]}>
            <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                    style={st.back}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="chevron-back" size={21} color={C.primary} />
                    <Text style={[st.backTxt, { color: C.primary }]}>Back</Text>
                </TouchableOpacity>

                <Text style={[st.h1, { color: C.textPrimary }]}>More</Text>
                <Text style={[st.sub, { color: C.textMuted }]}>Tools beyond your blood report.</Text>

                <View style={[st.card, { backgroundColor: C.bgCard, borderColor: C.borderLight }]}>
                    {ITEMS.map((item, i) => (
                        <TouchableOpacity
                            key={item.title}
                            style={[
                                st.row,
                                i < ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.borderLight },
                            ]}
                            onPress={() => open(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[st.iconWrap, { backgroundColor: item.soon ? C.inputBg : C.primaryMuted }]}>
                                <Ionicons name={item.icon} size={18} color={item.soon ? C.textDim : C.primary} />
                            </View>

                            <View style={st.grow}>
                                <View style={st.titleRow}>
                                    <Text style={[st.rowTitle, { color: item.soon ? C.textMuted : C.textPrimary }]}>
                                        {item.title}
                                    </Text>
                                    {item.soon ? (
                                        <View style={[st.badge, { backgroundColor: C.warningMuted }]}>
                                            <Text style={[st.badgeTxt, { color: C.warning }]}>SOON</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text style={[st.rowBlurb, { color: C.textMuted }]}>{item.blurb}</Text>
                            </View>

                            {!item.soon ? <Ionicons name="chevron-forward" size={17} color={C.textDim} /> : null}
                        </TouchableOpacity>
                    ))}
                </View>
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
    sub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 6, marginBottom: 24 },

    card: { borderRadius: 19, borderWidth: 1, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16 },
    iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowTitle: { fontFamily: FONTS.bodyBold, fontSize: 14.5 },
    rowBlurb: { fontFamily: FONTS.body, fontSize: 12.5, marginTop: 2 },

    badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    badgeTxt: { fontFamily: FONTS.bodyBold, fontSize: 9, letterSpacing: 0.6 },
});
