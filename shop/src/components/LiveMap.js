import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildMapHtml } from '../lib/mapHtml';

/**
 * Carte live : livreur, point de retrait, point de livraison et trace OSRM.
 * Web -> iframe Leaflet, natif -> WebView.
 */
export default function LiveMap({ rider = null, pickup = null, delivery = null, route = null, height = 300, style }) {
  const iframeRef = useRef(null);
  const webviewRef = useRef(null);

  // HTML construit une seule fois : les mises a jour passent par postMessage.
  const initialHtml = useMemo(
    () => buildMapHtml({ rider, pickup, delivery, route }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const data = {
      rider,
      pickup,
      delivery,
      route: (route && route.coordinates) || [],
    };
    const message = { type: 'mego:update', data };

    if (Platform.OS === 'web') {
      const win = iframeRef.current && iframeRef.current.contentWindow;
      if (win) win.postMessage(message, '*');
    } else if (webviewRef.current) {
      webviewRef.current.injectJavaScript(
        `window.postMessage(${JSON.stringify(message)}, '*'); true;`
      );
    }
  }, [rider, pickup, delivery, route]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, { height }, style]}>
        <iframe
          ref={iframeRef}
          title="Carte de livraison"
          srcDoc={initialHtml}
          style={{ border: 0, width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }, style]}>
      <WebView
        ref={webviewRef}
        source={{ html: initialHtml }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginTop: 12, overflow: 'hidden', borderRadius: 16, backgroundColor: '#0f172a' },
  web: { flex: 1, backgroundColor: '#0f172a' },
});
