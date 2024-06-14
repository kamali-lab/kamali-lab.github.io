---
title: "Making my local LLM voice assistant faster and more scalable with RAG"
date: 2024-06-14
---

If you read [my previous blog post](../local-llm-assistant), you probably already know that I like my smart home open-source and very local, and that certainly includes any voice assistant I may have. If you watched the video demo, you have probably also found out that it's... slow. Trust me, I did too.

Prefix caching helps, but it feels like cheating. Sure, it'll look amazing in a demo, but as soon as I start using my LLM for other things (which I do, quite often), that cache is going to get evicted and that first prompt is still going to be slow.

I started with the easy and expensive way. After some more calculations in front of my breaker, I decided that if I use a specific outlet in the kitchen and set a low power limit (260W), I can safely run dual RTX 3090's. It got me some really angry looks from my financial advisor, the ability to offload Whisper to GPU, and [Llama 3 70B AWQ](https://huggingface.co/casperhansen/llama-3-70b-instruct-awq) (which is amazing), but it's still just not fast enough:

{{< video src="/videos/ha-assist-without-rag.webm" width="100%" height="50%" type="webm" >}}

It would sure be nice to have something much smarter and faster... like this!

{{< video src="/videos/ha-assist-rag-example.mp4" width="50%" height="50%" type="mp4" >}}

Let's think about a smarter solution. To do so, let's learn more about how a language model works in the first place! NVIDIA has some [amazing documentation](https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/) about LLM inference that was incredibly helpful.

Language models have two phases. These are called "prefill" and "decode". When you send a prompt to a language model, you can see both of these in action. Prefill happens before you see the _first_ token, and decode happens for _every other token_ that is output. Decode is relatively stable and the overall "slowness" caused by decode is merely linear based on how much the LLM output. Streaming to HomeAssistant would really help reduce perceived slowdown by decode, but I couldn't really figure out the HomeAssistant codebase.

Let's focus on prefill for now, as I have discovered that it was taking a majority of the inference time. If you use language models often, you may have noticed that prefill scales really badly for very long contexts. This is because prefill latency increases _quadratically_ based on the context length. [Here is an interesting paper](https://arxiv.org/abs/2405.08944) that explains all the challenges of having very large context sizes. Since we are passing the entire smart home state to the LLM, prefill times are quite bad. Furthermore, Llama 3 has an 8k context size, and I was already at 60% before I even thought of adding weather information! Based on my previous experiences, the worst part of CPU inference with llama.cpp is always prefill, so I can only imagine how bad this would be without GPUs.

Needless to say, we need to do something about that massive prompt. We certainly need the smart home information for the LLM to know... about our smart home. But do we really need _all of it_? When's the last time you asked your voice assistant to summarize your entire house, or take action on every single device across multiple rooms?

Let's talk about RAG. [RAG (Retrieval Augmented Generation)](https://arxiv.org/abs/2312.10997) is a method commonly used to augment LLM prompts with external sources. The key part of RAG is called "embeddings". Without getting too deep into the math, embedding models take in a text input and project it onto a high-dimensional space. The idea is that sentences that are semantically closer will be closer to each other in this grid. This allows one to just compute the cosine similarity between the embedding of the user prompt and the embedding of each document to search through a massive knowledge base. This lets them find the articles that are most relevant for what the user just asked, augmenting the entire LLM prompt with the article, which in turn improves the quality of the responses given by the LLM.

What if we utilized this exact technique to figure out what parts of our massive prompt the LLM is going to need to answer the query? This will significantly reduce the context length, and maybe solve my speed problem! It would also make this system far more scalable, as I can now add more and more things without worrying about hitting the context limit. To do so, I first built a [RAG API](https://github.com/JohnTheNerd/homeassistant-llm-prompt-generator) that splits that massive prompt into a bunch of tiny sections. Then I added a few nice to have's like the weather forecast and calendar (I plan on adding e-mails, but that's a bit more work as I will need another layer of RAG). Afterwards, I just threw [ollama](https://www.ollama.com/) and [mxbai-embed-large](https://www.ollama.com/library/mxbai-embed-large) on one of my servers, put the [LiteLLM proxy server](https://docs.litellm.ai/docs/simple_proxy) in front of it, and configured the API to work with it all. I also updated [my fork of extended_openai_conversation](https://github.com/JohnTheNerd/extended_openai_conversation) to be able to use the new RAG API.

The way the API works is, it simply takes data that is unlikely to change frequently (say, all device names in an area, all entity names associated with them, but not the actual entity states), and caches all embeddings for it in RAM. For some things that don't necessarily have have a context-relevant title (such as the weather), it will simply calculate embeddings for a hardcoded title. It periodically updates these embeddings in the background. Whenever the user prompt comes in, because we have all the embeddings pre-computed in RAM, we can simply create embeddings for just the user prompt and compute the similarity. We take the top 3 "documents", at which point we get the actual device states. Finally, we augment that into the LLM prompt and end up with something that is still meaningful for the LLM while being significantly shorter! I also dynamically generate examples for in-context learning, where necessary, especially in places I found that LLMs tend to mistake service names. Since these examples are dynamically generated from the current smart home state, they are generally quite useful for the LLM.

After some experimentation, I came up with these categories:

- All calendar events for the next week. The title is also the entire calendar as we would like to be able to match on events.

- The weather forecast for the next week. The title is a hardcoded message.

- One category per area defined in HomeAssistant. The title is a list of all entities (name and ID, but not state) attached to all devices in that area.

- One category for the shopping list. The title is the entire shopping list.

- One category for whether anyone else is home. The title is a hardcoded message.

- One category for all media players and what they are playing. The title is the list of media players without what they are playing.

- Two other categories for laundry and color loop, which are very custom to my HomeAssistant setup (and hence are disabled in the sample configuration).

And, well, see the results for yourself!

Before:

{{< video src="/videos/ha-assist-without-rag.webm" width="100%" height="50%" type="webm" >}}

After:

{{< video src="/videos/ha-assist-with-rag.webm" width="100%" height="50%" type="webm" >}}