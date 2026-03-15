'use client'

import Link from 'next/link'
import {
  Calculator,
  BookOpen,
  Globe,
  FlaskConical,
  Briefcase,
  Monitor,
  Palette,
  Leaf,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const SUBJECT_ICONS: Record<string, LucideIcon> = {
  Mathematics: Calculator,
  'Mathematical Literacy': Calculator,
  'Physical Sciences': FlaskConical,
  'Life Sciences': Leaf,
  'Natural Sciences': FlaskConical,
  Accounting: Briefcase,
  'Business Studies': Briefcase,
  Economics: Briefcase,
  Geography: Globe,
  History: BookOpen,
  'Information Technology': Monitor,
  'Computer Applications Technology': Monitor,
  'Visual Arts': Palette,
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: 'bg-blue-50 text-blue-600 border-blue-200',
  'Physical Sciences': 'bg-purple-50 text-purple-600 border-purple-200',
  'Life Sciences': 'bg-green-50 text-green-600 border-green-200',
  Accounting: 'bg-amber-50 text-amber-600 border-amber-200',
  Geography: 'bg-teal-50 text-teal-600 border-teal-200',
  History: 'bg-rose-50 text-rose-600 border-rose-200',
}

interface SubjectCardProps {
  id: string
  name: string
  topicCount?: number
}

export function SubjectCard({ id, name, topicCount }: SubjectCardProps) {
  const Icon = SUBJECT_ICONS[name] || BookOpen
  const colorClass = SUBJECT_COLORS[name] || 'bg-gray-50 text-gray-600 border-gray-200'

  return (
    <Link href={`/subjects/${id}`}>
      <Card className={cn('cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]', colorClass)}>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="rounded-lg bg-white/60 p-3">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            {topicCount !== undefined && (
              <p className="text-sm opacity-70">{topicCount} topics</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
