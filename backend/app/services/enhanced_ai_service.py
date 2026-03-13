"""
Enhanced offline-capable AI service with local symptom checking
Minimal resource usage - works completely offline
"""
import json
import os
from datetime import datetime

class EnhancedAIService:
    """Enhanced AI service with offline capability and fuzzy matching"""
    
    def __init__(self):
        self.rules_path = os.path.join(os.path.dirname(__file__), '..', '..', 'ai_rules', 'symptom_rules.json')
        self._load_rules()
    
    def _load_rules(self):
        """Load symptom rules from local JSON"""
        try:
            with open(self.rules_path, 'r') as f:
                self.rules = json.load(f).get('rules', [])
        except FileNotFoundError:
            self.rules = []
    
    def check_symptoms(self, symptoms, fuzzy=True):
        """
        Check symptoms against rules with optional fuzzy matching
        Returns condition, severity, action, and emergency status
        """
        if not symptoms:
            return self._no_match_response()
        
        # Normalize symptoms to lowercase
        normalized_symptoms = [s.lower().strip() for s in symptoms]
        
        matches = []
        for rule in self.rules:
            rule_symptoms = [s.lower() for s in rule.get('symptoms', [])]
            
            if fuzzy:
                match_score = self._fuzzy_match_symptoms(normalized_symptoms, rule_symptoms)
            else:
                match_score = self._exact_match_symptoms(normalized_symptoms, rule_symptoms)
            
            if match_score > 0:
                matches.append({
                    'rule': rule,
                    'score': match_score,
                    'matched_count': sum(1 for s in normalized_symptoms if any(
                        self._similarity(s, rs) > 0.7 for rs in rule_symptoms
                    ))
                })
        
        if not matches:
            return self._no_match_response()
        
        # Return highest scoring match
        best_match = max(matches, key=lambda x: x['score'])
        result = best_match['rule'].copy()
        result['confidence_score'] = best_match['score']
        result['matched_symptoms'] = best_match['matched_count']
        result['total_rule_symptoms'] = len(best_match['rule'].get('symptoms', []))
        
        return result
    
    def _fuzzy_match_symptoms(self, user_symptoms, rule_symptoms):
        """Calculate fuzzy match score (0-1)"""
        if not rule_symptoms:
            return 0
        
        matches = sum(1 for user_sym in user_symptoms 
                     for rule_sym in rule_symptoms 
                     if self._similarity(user_sym, rule_sym) > 0.7)
        
        return matches / len(rule_symptoms)
    
    def _exact_match_symptoms(self, user_symptoms, rule_symptoms):
        """Calculate exact match score"""
        if not rule_symptoms:
            return 0
        
        matches = sum(1 for sym in rule_symptoms if sym in user_symptoms)
        return matches / len(rule_symptoms)
    
    def _similarity(self, s1, s2):
        """Simple string similarity (0-1)"""
        if s1 == s2:
            return 1.0
        
        # Basic Levenshtein-like similarity
        longer = s1 if len(s1) >= len(s2) else s2
        shorter = s2 if longer == s1 else s1
        
        if not longer:
            return 0.0
        
        edit_distance = self._levenshtein_distance(longer, shorter)
        return 1 - (edit_distance / len(longer))
    
    def _levenshtein_distance(self, s1, s2):
        """Calculate Levenshtein distance"""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    def _no_match_response(self):
        """Return when no symptoms match"""
        return {
            'condition': 'Symptoms unclear',
            'severity': 'unknown',
            'action': 'Please describe your symptoms in detail. Common symptoms include: fever, cough, headache, body pain, fatigue.',
            'emergency': False,
            'confidence_score': 0,
            'offline_mode': True
        }
    
    def get_severity_level(self, severity_str):
        """Get numeric severity level"""
        levels = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
        return levels.get(severity_str.lower(), 0)
    
    def get_rules_for_offline(self):
        """Get rules in compact format for offline storage"""
        return {
            'version': 1,
            'updated_at': datetime.utcnow().isoformat(),
            'rules': self.rules,
            'total_conditions': len(self.rules)
        }


class HealthTipGenerator:
    """Generate health tips based on conditions"""
    
    HEALTH_TIPS = {
        'fever': [
            'Stay hydrated - drink water frequently',
            'Rest as much as possible',
            'Take light, nutritious food',
            'Monitor temperature regularly',
            'Seek medical help if fever exceeds 104°F'
        ],
        'cough': [
            'Stay in warm, humid environment',
            'Drink hot liquids like tea with honey',
            'Avoid smoking and pollutants',
            'Take steam inhalation',
            'Get adequate rest'
        ],
        'headache': [
            'Rest in a dark, quiet room',
            'Apply cold/warm compress on forehead',
            'Stay hydrated',
            'Avoid bright lights and loud sounds',
            'Try relaxation techniques'
        ],
        'body_pain': [
            'Apply warm compress to affected area',
            'Take adequate rest',
            'Gentle stretching exercises',
            'Massage the area gently',
            'Stay warm and avoid cold'
        ]
    }
    
    @classmethod
    def get_tips(cls, condition):
        """Get health tips for a condition"""
        condition_key = condition.lower().replace(' ', '_')
        return cls.HEALTH_TIPS.get(condition_key, cls.HEALTH_TIPS.get('fever', []))
