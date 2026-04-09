"""
JP-Norm++ Training Pipeline
Fine-tuning mT5 for Japanese Text Normalization.
"""

import torch
from transformers import (
    MT5ForConditionalGeneration, 
    MT5Tokenizer, 
    Seq2SeqTrainingArguments, 
    Seq2SeqTrainer, 
    DataCollatorForSeq2Seq,
    BertForSequenceClassification,
    BertTokenizer,
    TrainingArguments,
    Trainer
)
from datasets import Dataset
import evaluate
import numpy as np

# 1. Configuration
MODEL_NAME = "google/mt5-small"
CLASSIFIER_MODEL = "cl-tohoku/bert-base-japanese-v3"
MAX_LENGTH = 128

# 2. Metrics Setup
bleu = evaluate.load("bleu")
rouge = evaluate.load("rouge")
accuracy = evaluate.load("accuracy")

def compute_metrics_seq2seq(eval_preds, tokenizer):
    preds, labels = eval_preds
    if isinstance(preds, tuple):
        preds = preds[0]
    
    decoded_preds = tokenizer.batch_decode(preds, skip_special_tokens=True)
    labels = np.where(labels != -100, labels, tokenizer.pad_token_id)
    decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)

    bleu_result = bleu.compute(predictions=decoded_preds, references=[[l] for l in decoded_labels])
    rouge_result = rouge.compute(predictions=decoded_preds, references=decoded_labels)

    return {
        "bleu": bleu_result["bleu"],
        "rougeL": rouge_result["rougeL"],
    }

def compute_metrics_classifier(eval_preds):
    logits, labels = eval_preds
    predictions = np.argmax(logits, axis=-1)
    return accuracy.compute(predictions=predictions, references=labels)

# 3. BERT Classifier Training
def train_classifier():
    print(f"Initializing Classifier: {CLASSIFIER_MODEL}...")
    tokenizer = BertTokenizer.from_pretrained(CLASSIFIER_MODEL)
    model = BertForSequenceClassification.from_pretrained(CLASSIFIER_MODEL, num_labels=2)

    # Dataset for classification (0: Clean, 1: Noisy)
    data = {
        "text": [
            "今日は本当に天気がいいですね。", "すごいです。", "行きましょう。", # Clean
            "今日わマジ暑い〜", "すっごーい！", "行こーぜ"             # Noisy
        ],
        "label": [0, 0, 0, 1, 1, 1]
    }
    dataset = Dataset.from_dict(data)

    def preprocess(examples):
        return tokenizer(examples["text"], truncation=True, padding="max_length", max_length=MAX_LENGTH)

    tokenized_dataset = dataset.map(preprocess, batched=True)

    args = TrainingArguments(
        output_dir="./classifier_results",
        evaluation_strategy="epoch",
        num_train_epochs=5,
        per_device_train_batch_size=4,
        logging_steps=5,
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tokenized_dataset,
        eval_dataset=tokenized_dataset,
        compute_metrics=compute_metrics_classifier,
    )

    print("Training Noise Classifier...")
    trainer.train()
    model.save_pretrained("./jp_noise_classifier")
    tokenizer.save_pretrained("./jp_noise_classifier")

# 4. Seq2Seq Normalizer Training
def train_normalizer():
    print(f"Initializing Normalizer: {MODEL_NAME}...")
    tokenizer = MT5Tokenizer.from_pretrained(MODEL_NAME)
    model = MT5ForConditionalGeneration.from_pretrained(MODEL_NAME)

    data = {
        "noisy": ["すっごーい！", "今日わマジ暑い〜", "行こーぜ"],
        "clean": ["すごいです。", "今日は本当に暑いです。", "行きましょう。"]
    }
    dataset = Dataset.from_dict(data)

    def preprocess(examples):
        inputs = ["normalize: " + doc for doc in examples["noisy"]]
        model_inputs = tokenizer(inputs, max_length=MAX_LENGTH, truncation=True, padding="max_length")
        with tokenizer.as_target_tokenizer():
            labels = tokenizer(examples["clean"], max_length=MAX_LENGTH, truncation=True, padding="max_length")
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs

    tokenized_dataset = dataset.map(preprocess, batched=True)

    args = Seq2SeqTrainingArguments(
        output_dir="./results",
        evaluation_strategy="epoch",
        learning_rate=2e-5,
        num_train_epochs=10,
        predict_with_generate=True,
        load_best_model_at_end=True,
        metric_for_best_model="bleu",
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=args,
        train_dataset=tokenized_dataset,
        eval_dataset=tokenized_dataset,
        tokenizer=tokenizer,
        data_collator=DataCollatorForSeq2Seq(tokenizer, model=model),
        compute_metrics=lambda p: compute_metrics_seq2seq(p, tokenizer),
    )

    print("Training Normalizer...")
    trainer.train()
    model.save_pretrained("./jp_norm_plus_plus")
    tokenizer.save_pretrained("./jp_norm_plus_plus")

# 5. Pipeline Integration (Inference Example)
def pipeline_inference(text):
    """
    Example of how the classifier acts as a pre-filter.
    """
    # 1. Load Classifier
    # classifier = BertForSequenceClassification.from_pretrained("./jp_noise_classifier")
    # ... tokenization ...
    # is_noisy = model(input_ids).logits.argmax().item() == 1
    
    # Mock logic for demonstration
    is_noisy = True # Result from BERT
    
    if not is_noisy:
        print("Text is clean. Skipping normalization.")
        return text
    
    print("Noise detected. Executing normalization pipeline...")
    # 2. Execute Normalizer
    # ...
    return "Normalized Text"

if __name__ == "__main__":
    print("JP-Norm++ Advanced Training Suite")
    train_classifier()
    # train_normalizer()
    print("Scripts ready. Requires torch, transformers, and fugashi (for Japanese BERT).")
