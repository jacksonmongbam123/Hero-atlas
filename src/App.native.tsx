import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, SafeAreaView, StatusBar, View, Text, TouchableOpacity, ActivityIndicator, BackHandler } from "react-native";
import { WebView } from "react-native-webview";

const APP_URL = "https://hero-atlas.onrender.com?platform=mobile";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  
  const canGoBackRef = useRef(false);
  const nativeCanGoBackRef = useRef(false);
  const webViewRef = useRef<WebView>(null);

  const handleReload = () => {
    setError(false);
    setLoading(true);
    setKey((prev) => prev + 1);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === "NAV_STATE") {
        const canBack = Boolean(data.canGoBack);
        setCanGoBack(canBack);
        canGoBackRef.current = canBack;
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      const shouldGoBack = canGoBackRef.current || nativeCanGoBackRef.current;
      if (shouldGoBack && webViewRef.current) {
        webViewRef.current.injectJavaScript("window.history.back(); true;");
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <View style={styles.content}>
        <WebView
          ref={webViewRef}
          key={key}
          source={{ uri: APP_URL }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          allowsInlineMediaPlayback={true}
          mixedContentMode="always"
          onMessage={handleMessage}
          onNavigationStateChange={(navState) => {
            nativeCanGoBackRef.current = navState.canGoBack;
            if (navState.canGoBack) {
              setCanGoBack(true);
              canGoBackRef.current = true;
            }
          }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          renderLoading={() => (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading Hero Atlas...</Text>
            </View>
          )}
        />
        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Hero Atlas Mobile</Text>
            <Text style={styles.errorText}>
              Unable to connect to portal server. Please check your internet connection.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
              <Text style={styles.retryText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  centerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
});
