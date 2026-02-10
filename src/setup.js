// Bridge: Make npm packages available as window globals
// so the existing app.jsx code works without changes

import { createClient } from '@supabase/supabase-js';
import React from 'react';

// Import only the icons actually used (tree-shakeable)
import {
  AlertCircle, Award, BarChart3, Bell, BookOpen, Brain, Briefcase,
  Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, Code, Copy,
  Crown, Database, Film, Flame, Flower2, Gift, Heart, History,
  Link, Lock, LogOut, Mail, Medal, MessageCircle, Play, Save,
  Settings, Shield, Ship, ShoppingCart, Star, Sun, Table, Target,
  TrendingUp, Trophy, Upload, User, Users, Zap,
  Plus, Minus, Eye, EyeOff, Search, Filter, ArrowUp, ArrowDown,
  RefreshCw, ExternalLink, Download, Trash, Edit, Check, Info, HelpCircle, X
} from 'lucide-react';

// Make supabase available as window.supabase.createClient
window.supabase = { createClient };

// Set up Lucide icons as React components
window.LucideIcons = {
  AlertCircle, Award, BarChart3, Bell, BookOpen, Brain, Briefcase,
  Calendar, CheckCircle, ChevronLeft, ChevronRight, Clock, Code, Copy,
  Crown, Database, Film, Flame, Flower2, Gift, Heart, History,
  Link, Lock, LogOut, Mail, Medal, MessageCircle, Play, Save,
  Settings, Shield, Ship, ShoppingCart, Star, Sun, Table, Target,
  TrendingUp, Trophy, Upload, User, Users, Zap,
  Plus, Minus, Eye, EyeOff, Search, Filter, ArrowUp, ArrowDown,
  RefreshCw, ExternalLink, Download, Trash, Edit, Check, Info, HelpCircle, X
};

// Load sql.js dynamically (WASM needs to be loaded from CDN)
const loadSqlJs = () => {
  return new Promise((resolve, reject) => {
    if (window.initSqlJs) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

// Pre-load sql.js in the background
loadSqlJs().catch(() => {});
