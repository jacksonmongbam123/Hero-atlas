import { Hero, ExpoFile } from "./types";

export const INITIAL_HEROES: Hero[] = [
  {
    name: "Dr. Arthur Pendelton",
    alias: "Aegis Sentinel",
    power: "Quantum Kinetic Shielding",
    category: "Science",
    description: "Generates unbreakable spatial-rupture shields powered by localized quantum entanglement.",
    headquarters: "Apex Labs, Sector 7",
    coordinates: { x: 30, y: 45 },
    stats: {
      durability: 95,
      strength: 72,
      speed: 55,
      energy: 88,
      intelligence: 90,
      combat: 68
    },
    backstory: "A brilliant physicist who survived a particle collider feedback loop, Dr. Pendelton discovered he could anchor coordinate points in 3D space to absorb infinite impact forces. He now coordinates defense systems for the Alliance."
  },
  {
    name: "Marc Vance",
    alias: "Apex Knight",
    power: "Tactical Foresight & Gadgetry",
    category: "Vigilante",
    description: "Peak-human conditioning armed with hyper-advanced predictive mapping tools and stealth armor.",
    headquarters: "The Citadel Basement",
    coordinates: { x: 45, y: 30 },
    stats: {
      durability: 60,
      strength: 65,
      speed: 78,
      energy: 20,
      intelligence: 98,
      combat: 95
    },
    backstory: "After his family's technology firm was targeted by corporate cartels, Vance forged himself into an urban protector. His 'Atlas Drone Network' monitors city centers, predicting crises before local authorities can respond."
  },
  {
    name: "Seraphina Vance",
    alias: "Mystic Shadow",
    power: "Ethereal Phasing & Occult Seals",
    category: "Mystic",
    description: "Slips between dimensional planes and manipulates dark-energy runes to bind supernatural entities.",
    headquarters: "The Obsidian Sanctum",
    coordinates: { x: 55, y: 40 },
    stats: {
      durability: 50,
      strength: 40,
      speed: 85,
      energy: 96,
      intelligence: 92,
      combat: 80
    },
    backstory: "Raised by the ancient Order of the Eclipse, Seraphina learned that shadows are gateways to alternative realities. She maintains the boundary between Earth-Prime and the astral voids, standing watch as the ultimate planar gatekeeper."
  },
  {
    name: "Zane Vesper",
    alias: "Starlight Wanderer",
    power: "Cosmic Radiation Manipulation",
    category: "Cosmic",
    description: "Absorbs stellar winds to fly at relativistic speeds and unleash thermonuclear energy bursts.",
    headquarters: "The Prism Station (Low Orbit)",
    coordinates: { x: 80, y: 20 },
    stats: {
      durability: 90,
      strength: 85,
      speed: 98,
      energy: 99,
      intelligence: 75,
      combat: 70
    },
    backstory: "Chosen by an ancient dying stellar core, Vesper serves as the planetary beacon of solar peace. Operating from a geosynchronous space elevator, he surveys Earth's borders, rushing down like a meteor to neutralize extinction-level threats."
  },
  {
    name: "Aria Nova",
    alias: "Cyber Vanguard",
    power: "Nanorobotic Technopathy",
    category: "Tech",
    description: "Instantly merges her consciousness with digital systems to rebuild materials and hack defenses.",
    headquarters: "Silicon Spire, Floor 101",
    coordinates: { x: 20, y: 70 },
    stats: {
      durability: 70,
      strength: 60,
      speed: 70,
      energy: 82,
      intelligence: 100,
      combat: 60
    },
    backstory: "A child prodigy who engineered her own prosthetic nervous system with custom nano-alloy networks. Aria can talk directly to code, transforming any piece of mechanical metal into an active defender of the digital grid."
  },
  {
    name: "Kaelen Drake",
    alias: "Chrono Weaver",
    power: "Temporal Deceleration Fields",
    category: "Mutant",
    description: "Dilates time locally, allowing him to react with superhuman reflexes and trace historical echoes.",
    headquarters: "The Hourglass Vault",
    coordinates: { x: 65, y: 75 },
    stats: {
      durability: 65,
      strength: 58,
      speed: 95,
      energy: 75,
      intelligence: 85,
      combat: 88
    },
    backstory: "Born with anomalous brain wave patterns that emit slow-neutrino fields, Drake experienced life in slow motion until learning to concentrate his fields outward. He functions as the team's master coordinator for tactical stealth operations."
  }
];

export const EXPO_CODEBASE_FILES: ExpoFile[] = [
  {
    name: "App.tsx",
    path: "App.tsx",
    language: "typescript",
    content: `import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Shield, Map, Search, Sparkles } from 'lucide-react-native';

// Import Screens
import HomeScreen from './screens/HomeScreen';
import AtlasScreen from './screens/AtlasScreen';
import RegistryScreen from './screens/RegistryScreen';
import GeneratorScreen from './screens/GeneratorScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [userName, setUserName] = useState<string>('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              if (route.name === 'Home') return <Shield size={size} color={color} />;
              if (route.name === 'Atlas') return <Map size={size} color={color} />;
              if (route.name === 'Registry') return <Search size={size} color={color} />;
              if (route.name === 'AI Lab') return <Sparkles size={size} color={color} />;
            },
            tabBarActiveTintColor: '#6366F1',
            tabBarInactiveTintColor: '#94A3B8',
            tabBarStyle: {
              backgroundColor: '#0F172A',
              borderTopWidth: 1,
              borderTopColor: '#1E293B',
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            headerStyle: {
              backgroundColor: '#0B0F19',
              borderBottomWidth: 1,
              borderBottomColor: '#1E293B',
            },
            headerTitleStyle: {
              color: '#F8FAFC',
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen name="Home">
            {(props) => <HomeScreen {...props} userName={userName} setUserName={setUserName} />}
          </Tab.Screen>
          <Tab.Screen name="Atlas" component={AtlasScreen} />
          <Tab.Screen name="Registry" component={RegistryScreen} />
          <Tab.Screen name="AI Lab" component={GeneratorScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
});`
  },
  {
    name: "HomeScreen.tsx",
    path: "screens/HomeScreen.tsx",
    language: "typescript",
    content: `import React from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Shield, Sparkles, BookOpen } from 'lucide-react-native';

interface HomeProps {
  userName: string;
  setUserName: (name: string) => void;
}

export default function HomeScreen({ userName, setUserName }: HomeProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hello World Header */}
      <View style={styles.heroCard}>
        <Shield size={48} color="#6366F1" style={styles.logo} />
        <Text style={styles.title}>Hello, World!</Text>
        <Text style={styles.subtitle}>
          Welcome to your first React Native Expo application on Hero Atlas.
        </Text>
      </View>

      {/* Dynamic Greeting */}
      <View style={styles.inputSection}>
        <Text style={styles.label}>Personalize Your Simulator:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name..."
          placeholderTextColor="#64748B"
          value={userName}
          onChangeText={setUserName}
        />
        {userName ? (
          <Text style={styles.greetingText}>
            Welcome aboard, <Text style={styles.highlight}>{userName}</Text>! Explore the superhero coordinates on the Atlas.
          </Text>
        ) : null}
      </View>

      {/* Instructions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BookOpen size={20} color="#38BDF8" />
          <Text style={styles.cardTitle}>Quick Instructions</Text>
        </View>
        <Text style={styles.cardBody}>
          1. Go to the <Text style={styles.bold}>Atlas</Text> tab to view real-time headquarters coordinates.{"\\n"}{"\\n"}
          2. Check the <Text style={styles.bold}>Registry</Text> to inspect distinct superhero powers and lore.{"\\n"}{"\\n"}
          3. Tap <Text style={styles.bold}>AI Lab</Text> to invoke Gemini to draft custom hero files and plot them!
        </Text>
      </View>

      {/* Expo Metadata */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Expo Metro Bundler • Active on SDK 51</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  content: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  logo: {
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#C7D2FE',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  label: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  greetingText: {
    color: '#E2E8F0',
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  highlight: {
    color: '#6366F1',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardBody: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#475569',
    fontSize: 12,
  },
});`
  },
  {
    name: "AtlasScreen.tsx",
    path: "screens/AtlasScreen.tsx",
    language: "typescript",
    content: `import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Map, MapPin, Eye, Compass } from 'lucide-react-native';

// Sample static heroes data for simulation
const HERO_PINS = [
  { alias: "Aegis Sentinel", x: 30, y: 45, headquarters: "Apex Labs, Sector 7", category: "Science" },
  { alias: "Apex Knight", x: 45, y: 30, headquarters: "The Citadel Basement", category: "Vigilante" },
  { alias: "Mystic Shadow", x: 55, y: 40, headquarters: "The Obsidian Sanctum", category: "Mystic" },
  { alias: "Starlight Wanderer", x: 80, y: 20, headquarters: "The Prism Station", category: "Cosmic" }
];

export default function AtlasScreen() {
  const [selectedPin, setSelectedPin] = useState<typeof HERO_PINS[0] | null>(null);

  return (
    <View style={styles.container}>
      {/* Map Header */}
      <View style={styles.header}>
        <Compass size={20} color="#818CF8" />
        <Text style={styles.headerTitle}>Interactive 2D Grid Map</Text>
      </View>

      {/* Styled Grid Board acting as standard MapView */}
      <View style={styles.mapFrame}>
        <View style={styles.mapGrid}>
          {HERO_PINS.map((pin, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.marker,
                { left: \`\${pin.x}%\`, top: \`\${pin.y}%\` }
              ]}
              onPress={() => setSelectedPin(pin)}
            >
              <MapPin size={24} color={selectedPin?.alias === pin.alias ? '#F43F5E' : '#6366F1'} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pin Detail Overlay */}
      {selectedPin ? (
        <View style={styles.detailsBox}>
          <View style={styles.detailsRow}>
            <Text style={styles.detailAlias}>{selectedPin.alias}</Text>
            <Text style={[styles.badge, { backgroundColor: '#1E293B' }]}>{selectedPin.category}</Text>
          </View>
          <Text style={styles.detailHq}>HQ: {selectedPin.headquarters}</Text>
          <Text style={styles.detailCoord}>Coordinates: Grid X:{selectedPin.x}, Y:{selectedPin.y}</Text>
          <TouchableOpacity style={styles.viewBtn} onPress={() => {}}>
            <Eye size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.viewBtnText}>Open File</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>Tap on any map marker to inspect localized coordinates.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  mapFrame: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    position: 'relative',
    minHeight: 280,
  },
  mapGrid: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  marker: {
    position: 'absolute',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  detailsBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailAlias: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailHq: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  detailCoord: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 10,
  },
  badge: {
    color: '#818CF8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 'bold',
  },
  viewBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  placeholderBox: {
    marginTop: 16,
    padding: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
});`
  },
  {
    name: "package.json",
    path: "package.json",
    language: "json",
    content: `{
  "name": "hero-atlas-mobile",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-status-bar": "~1.12.1",
    "react": "18.2.0",
    "react-native": "0.74.1",
    "@react-navigation/native": "^6.1.17",
    "@react-navigation/bottom-tabs": "^6.5.20",
    "lucide-react-native": "^0.379.0",
    "react-native-svg": "15.2.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "typescript": "^5.1.3"
  },
  "private": true
}`
  },
  {
    name: "app.json",
    path: "app.json",
    language: "json",
    content: `{
  "expo": {
    "name": "Hero Atlas Mobile",
    "slug": "hero-atlas-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0B0F19"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0B0F19"
      }
    }
  }
}`
  },
  {
    name: "README.md",
    path: "README.md",
    language: "markdown",
    content: `# Hero Atlas Mobile Expo App

A React Native Mobile Expo application simulating an interactive, location-coordinate map grid for Superheroes, featuring a Hello World onboarding greeting.

## 🚀 How to Run Locally

### Prerequisites
1. Install **Node.js** (v18 or newer recommended).
2. Install the **Expo Go** app on your iOS (App Store) or Android (Google Play Store) mobile device.

### Setup Instructions
1. Extract or copy these project files into an empty directory on your computer:
   - \`App.tsx\`
   - \`package.json\`
   - \`app.json\`
   - Create a folder named \`screens/\` and place \`HomeScreen.tsx\`, \`AtlasScreen.tsx\`, \`RegistryScreen.tsx\`, and \`GeneratorScreen.tsx\` inside.

2. Open your terminal in that directory and run:
   \`\`\`bash
   npm install
   \`\`\`

3. Start the local development server:
   \`\`\`bash
   npx expo start
   \`\`\`

4. Connect your phone:
   - **Android**: Scan the QR code displayed in your terminal using the Expo Go app.
   - **iOS**: Scan the QR code with your native Camera app (it will open Expo Go), or sign into the same Expo account.
`
  }
];
