import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const TERMS_URL = 'https://freesurf.tools/terms';
const PRIVACY_URL = 'https://freesurf.tools/privacy';
const DIGEST_URL = 'https://feedfree.tech';

const brand = '#5b8cff';
const text = '#e8ecff';
const muted = '#5f6b7a';
const surface = '#0d0d0d';
const border = '#1a1a1a';

export default function Onboarding({ onAuthenticated }) {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [digest, setDigest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const LinkText = ({ url, label }) => (
    <Text style={{ color: brand, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(url)}>{label}</Text>
  );

  async function emailSubmit() {
    if (!email.trim() || !password) return;
    if (mode === 'signup' && !agree) { setMessage('Please agree to the Terms and Privacy Policy.'); return; }
    if (mode === 'signup' && password !== confirm) { setMessage("Passwords don't match"); return; }
    if (mode === 'signup' && password.length < 6) { setMessage('Password must be 6+ characters'); return; }
    setLoading(true); setMessage('');
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMessage(error.message);
      else onAuthenticated();
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) setMessage(error.message);
      else if (data.session) onAuthenticated();
      else { setMessage('Account created. Check your email to confirm, then sign in.'); setMode('signin'); }
    }
    setLoading(false);
  }

  async function oauth(provider) {
    if (mode === 'signup' && !agree) { setMessage('Please agree to the Terms and Privacy Policy.'); return; }
    setLoading(true); setMessage('');
    try {
      const redirectTo = AuthSession.makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) { setMessage(error.message); return; }
      if (!data?.url) return;
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        const code = new URL(result.url).searchParams.get('code');
        if (code) {
          const { error: ex } = await supabase.auth.exchangeCodeForSession(code);
          if (ex) setMessage(ex.message);
        }
      } else if (result.type === 'dismiss') {
        setMessage('Sign-in was canceled.');
      }
    } catch (e) {
      setMessage(e?.message || 'Sign-in failed.');
    }
    setLoading(false);
  }

  const inputStyle = [s.input, { color: text, borderColor: border, backgroundColor: surface }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 28, paddingTop: 90, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text style={s.brand}>FreeSurf</Text>
        <Text style={s.title}>Create account</Text>
        <Text style={{ color: muted, marginBottom: 8 }}>Create a free account to get started.</Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {['google', 'apple'].map((p) => (
            <TouchableOpacity key={p} onPress={() => oauth(p)} disabled={loading} style={[s.oauthBtn, { flex: 1 }]}>
              <Text style={s.oauthText}>Continue with {p === 'google' ? 'Google' : 'Apple'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: border }} />
          <Text style={{ color: muted }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: border }} />
        </View>

        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: border, borderRadius: 999, padding: 4 }}>
          {['signup', 'signin'].map((m) => (
            <TouchableOpacity key={m} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }} onPress={() => { setMode(m); setMessage(''); }}>
              <Text style={{ color: mode === m ? brand : muted, fontWeight: mode === m ? '700' : '500', fontSize: 14 }}>{m === 'signup' ? 'Create account' : 'Sign in'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput style={inputStyle} placeholder="Email" placeholderTextColor={muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={inputStyle} placeholder="Password" placeholderTextColor={muted} secureTextEntry value={password} onChangeText={setPassword} />
        {mode === 'signup' && <TextInput style={inputStyle} placeholder="Confirm password" placeholderTextColor={muted} secureTextEntry value={confirm} onChangeText={setConfirm} />}

        {mode === 'signup' && (
          <>
            <TouchableOpacity onPress={() => setAgree(!agree)} style={s.checkRow}>
              <Text style={{ color: brand, fontWeight: '700', fontSize: 18, lineHeight: 20 }}>{agree ? '☑' : '☐'}</Text>
              <Text style={{ color: text, fontSize: 14, flex: 1 }}>
                I agree to the <LinkText url={TERMS_URL} label="Terms" /> and <LinkText url={PRIVACY_URL} label="Privacy Policy" />
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDigest(!digest)} style={s.checkRow}>
              <Text style={{ color: muted, fontWeight: '700', fontSize: 18, lineHeight: 20 }}>{digest ? '☑' : '☐'}</Text>
              <Text style={{ color: muted, fontSize: 13, flex: 1 }}>
                Subscribe to the <LinkText url={DIGEST_URL} label="FeedFree Digest" /> — Curated blog-length social posts covering AI, SEO, social media marketing and more - from X and LinkedIn
              </Text>
            </TouchableOpacity>
          </>
        )}

        {message ? <Text style={{ color: '#f87171', fontSize: 13 }}>{message}</Text> : null}

        <TouchableOpacity style={s.btn} onPress={emailSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  brand: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: brand, marginBottom: 4 },
  title: { fontSize: 30, fontWeight: '700', color: text, marginBottom: 2 },
  oauthBtn: { backgroundColor: '#1e2a4a', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  oauthText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  checkRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 2 },
  btn: { backgroundColor: brand, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
