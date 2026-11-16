import React, { useRef, useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, TextInput, ActivityIndicator } from "react-native";

// Assistant IA de la boutique : visible uniquement si le vendeur a active l'assistant (abonnement).
// Les reponses viennent du serveur MeGo (route /chat), qui lit lui-meme les produits et prix de la boutique.
export default function ChatWidget({ slug, serverUrl }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState([{ from: "bot", text: "Bonjour ! Posez-moi une question sur les produits ou les prix de cette boutique." }]);
  const scroller = useRef(null);

  const ask = async () => {
    const q = text.trim();
    if (!q || busy || !serverUrl) return;
    setText("");
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setBusy(true);
    let answer = "Desole, l'assistant est indisponible pour le moment.";
    try {
      const r = await fetch(serverUrl.replace(/\/+$/, "") + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, question: q }),
      });
      const d = await r.json();
      if (d && d.answer) answer = d.answer;
      else if (d && d.error) answer = d.error;
    } catch (e) {}
    setMsgs((m) => [...m, { from: "bot", text: answer }]);
    setBusy(false);
    setTimeout(() => scroller.current && scroller.current.scrollToEnd({ animated: true }), 50);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="absolute bottom-24 left-4 rounded-full bg-primary px-4 py-3">
        <Text className="text-[13px] font-bold text-white">Assistant</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-surface">
          <View className="flex-row items-center justify-between bg-navy px-4 py-4">
            <Text className="text-[16px] font-bold text-white">Assistant de la boutique</Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text className="text-[14px] font-semibold text-white">Fermer</Text>
            </Pressable>
          </View>
          <ScrollView ref={scroller} contentContainerStyle={{ padding: 16 }}>
            {msgs.map((m, i) => (
              <View key={i} className={`mb-3 max-w-[85%] rounded-2xl px-4 py-3 ${m.from === "me" ? "self-end bg-primary" : "self-start bg-white"}`}>
                <Text className={`text-[14px] ${m.from === "me" ? "text-white" : "text-ink"}`}>{m.text}</Text>
              </View>
            ))}
            {busy ? <ActivityIndicator color="#76D865" /> : null}
          </ScrollView>
          <View className="flex-row items-center border-t border-line bg-white p-3">
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={ask}
              placeholder="Votre question…"
              className="mr-2 flex-1 rounded-full border border-line px-4 py-3 text-[14px] text-ink"
            />
            <Pressable onPress={ask} disabled={busy} className="rounded-full bg-primary px-5 py-3">
              <Text className="text-[14px] font-bold text-white">Envoyer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
