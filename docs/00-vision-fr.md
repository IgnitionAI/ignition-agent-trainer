# Vision — Ignition Agent Trainer

## Phrase simple

Créer la couche TypeScript qui permet d'évaluer, comparer et améliorer les agents IA existants.

Le framework ne remplace pas LangChain, LangGraph, Mastra ou Vercel AI SDK. Il les enveloppe.

```txt
Agent existant
  ↓
Adapter Ignition
  ↓
Dataset
  ↓
Rewards / scorers
  ↓
Rapport
  ↓
Optimisation
```

## Le point clé

On ne réentraîne pas le LLM au début.

On améliore l'agent en optimisant :

- le prompt système,
- les instructions de tool calling,
- les tools disponibles,
- l'ordre des tools,
- les paramètres RAG,
- le reranking,
- les règles de vérification,
- le contexte envoyé au modèle,
- le workflow complet.

Autrement dit :

```txt
RL signals → context engineering → agent optimization
```

## Pourquoi maintenant

Les entreprises savent faire des prototypes RAG. Le vrai problème est maintenant :

- mesurer la qualité,
- éviter les régressions,
- comparer plusieurs stratégies,
- optimiser coût/latence/qualité,
- industrialiser les agents.

C'est exactement la suite logique d'IgnitionRAG.

## Positionnement produit

> Build, evaluate and optimize production-grade AI agents on your own business tasks.

En français :

> Construire, évaluer et optimiser des agents IA de production sur les vrais cas métier de l'entreprise.

## Pourquoi c'est différent d'un framework agentique classique

Un framework agentique répond à :

```txt
Comment construire un agent ?
```

Ignition Agent Trainer répond à :

```txt
Comment savoir si cet agent marche ?
Comment l'améliorer ?
Comment prouver qu'il s'améliore ?
```

## Modèle open source + SaaS

```txt
Framework open source
  ↓
Adoption développeur
  ↓
IgnitionRAG SaaS
  ↓
Monétisation entreprise
```

Le framework devient le moteur technique et marketing. IgnitionRAG devient la plateforme de production, de reporting et de gouvernance.
