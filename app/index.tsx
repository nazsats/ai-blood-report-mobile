import { Redirect } from 'expo-router';

// Land on the scanner, not a dashboard. Someone opening this app has a blood
// report in their hand and one question about it; anything else on the first
// screen is something they have to read past to get started.
export default function Index() {
    return <Redirect href="/(tabs)/upload" />;
}
