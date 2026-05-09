import { CircleQuestionMark } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'

type LearnMoreProps = Omit<React.ComponentProps<typeof Popover>, 'children'> & {
  children?: React.ReactNode
  contentProps?: Omit<React.ComponentProps<typeof PopoverContent>, 'children'>
  triggerProps?: React.ComponentProps<typeof PopoverTrigger>
}

export function LearnMore({
  children,
  contentProps,
  triggerProps,
  ...props
}: LearnMoreProps) {
  return (
    <Popover {...props}>
      <PopoverTrigger
        {...triggerProps}
        className={cn('size-5 rounded-full', triggerProps?.className)}
        render={<Button variant='outline' size='icon' />}
      >
        <span className='sr-only'>Learn more</span>
        <CircleQuestionMark className='size-4 [&>circle]:hidden' />
      </PopoverTrigger>
      <PopoverContent
        side='top'
        align='start'
        {...contentProps}
        className={cn('text-sm text-muted-foreground', contentProps?.className)}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
