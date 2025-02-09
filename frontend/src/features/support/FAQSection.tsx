import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'credits' | 'providers' | 'technical';
}

const faqs: FAQItem[] = [
  {
    question: 'How does credit pricing work?',
    answer: 'Credits are priced at a base rate of $0.001 USD per credit. Different models have different multipliers: GPT-4 costs 2x base rate, while GPT-3 costs 1x. GPU types also affect pricing: H100 has a 2x multiplier, and A100 has a 1.5x multiplier.',
    category: 'credits'
  },
  {
    question: 'What is the minimum credit purchase?',
    answer: 'The minimum credit purchase is $1.00, which provides you with 1,000 base credits. The maximum single purchase is $1,000.00.',
    category: 'credits'
  },
  {
    question: 'How does the provider selection work?',
    answer: 'Our system automatically matches your request with the most suitable provider based on your specified price and latency requirements. You can also manually select preferred providers for your requests.',
    category: 'providers'
  },
  {
    question: 'What happens if a provider becomes unavailable?',
    answer: 'Our system automatically detects provider availability and will route your request to the next best available provider that meets your requirements. If no suitable provider is found, you\'ll be notified immediately.',
    category: 'providers'
  },
  {
    question: 'How do I monitor my usage?',
    answer: 'You can view your credit usage, transaction history, and real-time metrics in the dashboard. Detailed analytics are available for all your requests, including performance metrics and cost breakdowns.',
    category: 'technical'
  },
  {
    question: 'What kind of uptime do you guarantee?',
    answer: 'We maintain a 99.9% uptime SLA for the matching service. Individual provider availability may vary, but our system ensures your requests are always routed to available providers.',
    category: 'technical'
  },
  {
    question: 'How secure is my data?',
    answer: 'All data is encrypted in transit and at rest. We use industry-standard TLS for all API connections, and provider communications are secured through authenticated channels.',
    category: 'general'
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer refunds for unused credits within 30 days of purchase. For failed requests due to system errors, credits are automatically refunded to your account.',
    category: 'general'
  }
];

interface FAQItemProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ item, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b last:border-0">
      <button
        className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-muted/50 focus:outline-none focus:bg-muted/50"
        onClick={onToggle}
      >
        <span className="font-medium">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-[max-height] duration-300 ease-in-out",
          isOpen ? "max-h-96" : "max-h-0"
        )}
      >
        <div className="px-4 pb-4 pt-2 text-muted-foreground">
          {item.answer}
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<FAQItem['category'] | 'all'>('all');

  const toggleItem = (question: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(question)) {
      newOpenItems.delete(question);
    } else {
      newOpenItems.add(question);
    }
    setOpenItems(newOpenItems);
  };

  const categories: Array<{ value: FAQItem['category'] | 'all'; label: string }> = [
    { value: 'all', label: 'All Questions' },
    { value: 'general', label: 'General' },
    { value: 'credits', label: 'Credits & Billing' },
    { value: 'providers', label: 'Providers' },
    { value: 'technical', label: 'Technical' }
  ];

  const filteredFaqs = faqs.filter(
    faq => selectedCategory === 'all' || faq.category === selectedCategory
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequently Asked Questions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm",
                selectedCategory === category.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {category.label}
            </button>
          ))}
        </div>
        <div className="rounded-lg border">
          {filteredFaqs.map((faq) => (
            <FAQItem
              key={faq.question}
              item={faq}
              isOpen={openItems.has(faq.question)}
              onToggle={() => toggleItem(faq.question)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}