import React from "react";
import { View, Text, ScrollView } from "react-native";
import ScreenHeader from "../components/ScreenHeader";
import { Card, SectionTitle, Row } from "../components/Kit";

/** A propos : informations sur l'application vendeur. */
export default function AboutScreen({ vendor, onMenuPress, onBack }) {
  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader title="A propos" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Card>
          <Text className="text-[16px] font-bold text-ink">MeGo Vendor</Text>
          <Text className="mt-1 text-[13px] leading-5 text-muted">
            Application vendeur MeGo : gerez vos commandes, votre catalogue, vos revenus et vos
            horaires depuis un seul endroit.
          </Text>
        </Card>

        <SectionTitle>Informations</SectionTitle>
        <Card>
          <Row label="Version" value="1.0.0" icon="info" />
          <Row label="Boutique" value={vendor && vendor.name ? vendor.name : "-"} icon="home" />
          <Row label="Categorie" value={vendor && vendor.category ? vendor.category : "-"} icon="package" />
          <Row label="Support" value="support@mego.app" icon="help" />
        </Card>

        <SectionTitle>Conditions</SectionTitle>
        <Card>
          <Text className="text-[13px] leading-5 text-muted">
            En utilisant MeGo Vendor, vous acceptez de fournir des informations exactes sur votre
            boutique et de traiter les commandes dans les delais indiques.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
