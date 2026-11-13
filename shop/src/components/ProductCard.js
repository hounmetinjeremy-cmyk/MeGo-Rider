import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import Icon from "./Icon";

export default function ProductCard({ product, qty, onAdd, onRemove }) {
  const price = Number(product.price || 0);
  const available = product.is_available !== false && Number(product.stock ?? 1) > 0;

  return (
    <View className="mb-3 flex-row rounded-2xl bg-white p-3">
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} className="h-20 w-20 rounded-xl" />
      ) : (
        <View className="h-20 w-20 items-center justify-center rounded-xl bg-chip">
          <Icon name="package" size={22} color="#7E8B9B" />
        </View>
      )}

      <View className="ml-3 flex-1 justify-center">
        <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
          {product.name}
        </Text>
        {product.description ? (
          <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}
        <Text className="mt-1 text-[14px] font-extrabold text-navy">
          {price.toLocaleString("fr-FR")} F
        </Text>
      </View>

      {available ? (
        qty > 0 ? (
          <View className="flex-row items-center self-center">
            <Pressable
              onPress={onRemove}
              className="h-8 w-8 items-center justify-center rounded-full bg-chip active:opacity-70">
              <Icon name="minus" size={14} color="#1D1D1D" />
            </Pressable>
            <Text className="mx-2 text-[14px] font-bold text-ink">{qty}</Text>
            <Pressable
              onPress={onAdd}
              className="h-8 w-8 items-center justify-center rounded-full bg-primary active:opacity-70">
              <Icon name="plus" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={onAdd}
            className="self-center rounded-full bg-primary px-4 py-2 active:opacity-70">
            <Text className="text-[13px] font-bold text-white">Ajouter</Text>
          </Pressable>
        )
      ) : (
        <Text className="self-center text-[11px] font-semibold text-muted">Indisponible</Text>
      )}
    </View>
  );
}
