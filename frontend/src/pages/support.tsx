import { MainLayout } from '@/layouts/MainLayout';
import { FAQSection } from '@/features/support/FAQSection';
import { ContactForm } from '@/features/support/ContactForm';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LifeBuoy, Book, FileQuestion } from 'lucide-react';

export default function Support() {
  return (
    <MainLayout>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Support Center</h1>
          <p className="text-muted-foreground">
            Get help with your GPU marketplace integration. Check out our FAQ or reach out to our support team.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <FileQuestion className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">FAQ</h3>
                <p className="text-sm text-muted-foreground">
                  Find answers to common questions
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Book className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  Read our integration guides
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <LifeBuoy className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Contact Support</h3>
                <p className="text-sm text-muted-foreground">
                  Get help from our team
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <section id="faq" className="mb-12">
          <FAQSection />
        </section>

        {/* Contact Form */}
        <section id="contact" className="mb-12">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Can't find what you're looking for?</CardTitle>
              <CardDescription>
                Our support team typically responds within 24 hours on business days.
              </CardDescription>
            </CardHeader>
          </Card>
          <ContactForm />
        </section>

        {/* Response Time Card */}
        <Card className="bg-primary/5 border-none">
          <CardHeader>
            <div className="flex items-center gap-4">
              <LifeBuoy className="h-12 w-12 text-primary" />
              <div>
                <CardTitle>Support Hours</CardTitle>
                <CardDescription>
                  Monday - Friday: 9:00 AM - 5:00 PM PST<br />
                  Emergency support available 24/7 for critical issues
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </MainLayout>
  );
}