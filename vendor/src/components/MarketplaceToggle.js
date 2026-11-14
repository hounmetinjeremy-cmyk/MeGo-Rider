import React, { useEffect, useState } from 'react';
import { View, Text, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';

/**
 * CAS A : la boutique reste privée, accessible seulement par son lien.
 * CAS B : la boutique apparaît dans le flux global et l'onglet Découverte.
 */
export default function MarketplaceToggle({ vendorId, initialValue = false, onChange }) {
  const [visible, setVisible] = useState(!!initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setVisible(!!initialValue);
  }, [initialValue]);

  async function toggle(next) {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    const previous = visible;
    setVisible(next);
    const { data, error: err } = await supabase.rpc('set_marketplace_visibility', {
      p_vendor_id: vendorId,
      p_visible: next,
    });
    setLoading(false);
    if (err || !data || data.ok === false) {
      setVisible(previous);
      setError((data && data.error) || (err && err.message) || 'Modification impossible');
      return;
    }
    setVisible(!!data.is_marketplace_visible);
    if (typeof onChange === 'function') onChange(!!data.is_marketplace_visible);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.title}>Afficher dans la Découverte</Text>
          <Text style={styles.subtitle}>
            {visible
              ? 'Votre boutique est visible par tous les clients (flux global).'
              : 'Vitrine privée : seule votre lien partagé donne accès à la boutique.'}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Switch value={visible} onValueChange={toggle} disabled={!vendorId} />
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1, paddingRight: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 17 },
  error: { fontSize: 12, color: '#DC2626', marginTop: 8 },
});
