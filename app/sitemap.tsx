import { Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';

export default function SitemapScreen() {
  return (
    <ScrollView className="flex-1 bg-white px-4 py-8">
      <Text className="text-3xl font-bold mb-6">Sitemap</Text>
      <Text className="text-lg font-bold mb-2">Onboarding</Text>
      {[...Array(12).keys()].slice(1).map(i => (
        <Link key={i} href={`/onboarding/${i}`} className="text-blue-600 mb-1">
          <Text>/onboarding/{i}</Text>
        </Link>
      ))}
      <Link href="/onboarding/username" className="text-blue-600 mb-1"><Text>/onboarding/username</Text></Link>
      <Link href="/onboarding/rating" className="text-blue-600 mb-1"><Text>/onboarding/rating</Text></Link>
      <Link href="/onboarding/lambFound" className="text-blue-600 mb-1"><Text>/onboarding/lambFound</Text></Link>
      <Link href="/onboarding/explainer" className="text-blue-600 mb-1"><Text>/onboarding/explainer</Text></Link>
      <Link href="/onboarding/explainerHearts" className="text-blue-600 mb-1"><Text>/onboarding/explainerHearts</Text></Link>
      <Link href="/onboarding/LoadingScreen" className="text-blue-600 mb-1"><Text>/onboarding/LoadingScreen</Text></Link>
      <Text className="text-lg font-bold mt-4 mb-2">Pricing</Text>
      <Link href="/onboarding/pricing/OldPricingScreen" className="text-blue-600 mb-1"><Text>/onboarding/pricing/OldPricingScreen</Text></Link>
      <Link href="/onboarding/pricing/FreeOffer" className="text-blue-600 mb-1"><Text>/onboarding/pricing/FreeOffer</Text></Link>
      <Link href="/onboarding/pricing/ShepherdCommunity" className="text-blue-600 mb-1"><Text>/onboarding/pricing/ShepherdCommunity</Text></Link>
      <Link href="/onboarding/pricing/selfFundedMission" className="text-blue-600 mb-1"><Text>/onboarding/pricing/selfFundedMission</Text></Link>
      <Text className="text-lg font-bold mt-4 mb-2">Tabs</Text>
      <Link href="/(tabs)" className="text-blue-600 mb-1"><Text>/(tabs)</Text></Link>
      <Link href="/(tabs)/bible" className="text-blue-600 mb-1"><Text>/(tabs)/bible</Text></Link>
      <Link href="/(tabs)/profile" className="text-blue-600 mb-1"><Text>/(tabs)/profile</Text></Link>
      <Text className="text-lg font-bold mt-4 mb-2">Auth</Text>
      <Link href="/(auth)" className="text-blue-600 mb-1"><Text>/(auth)</Text></Link>
      <Text className="text-lg font-bold mt-4 mb-2">Standalone</Text>
      <Link href="/PricingScreen" className="text-blue-600 mb-1"><Text>/PricingScreen</Text></Link>
      <Link href="/bibleCacheTest" className="text-blue-600 mb-1"><Text>/bibleCacheTest</Text></Link>
      <Link href="/success" className="text-blue-600 mb-1"><Text>/success</Text></Link>
      <Link href="/streak" className="text-blue-600 mb-1"><Text>/streak</Text></Link>
      <Link href="/login" className="text-blue-600 mb-1"><Text>/login</Text></Link>
      <Link href="/biblePreview" className="text-blue-600 mb-1"><Text>/biblePreview</Text></Link>
      <Link href="/bibleReader" className="text-blue-600 mb-1"><Text>/bibleReader</Text></Link>
      <Link href="/newBibleReader" className="text-blue-600 mb-1"><Text>/newBibleReader</Text></Link>
      <Link href="/basicTestModal" className="text-blue-600 mb-1"><Text>/basicTestModal</Text></Link>
    </ScrollView>
  );
} 