import { useForm } from '@tanstack/react-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import * as z from 'zod'
import { IconFacebook, IconGithub } from '@/assets/brand-icons'
import { authClient } from '@/lib/auth-client'
import { Button } from '@workspace/ui/components/button'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { PasswordInput } from '@workspace/ui/components/password-input'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email.' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Please enter your password.')
    .min(7, 'Password must be at least 7 characters long.'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            const targetPath = redirectTo || '/'
            navigate({ to: targetPath, replace: true })
            toast.success(`Welcome back, ${value.email}!`)
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText)
          },
        },
      )
    },
  })

  return (
    <form
      id='sign-in-form'
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className={className}
      {...props}
    >
      <FieldGroup>
        <form.Field
          name='email'
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder='name@example.com'
                  autoComplete='email'
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        />
        <form.Field
          name='password'
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field className='relative' data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <PasswordInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder='********'
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                <Link
                  to='/forgot-password'
                  className='absolute inset-e-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75 text-end'
                >
                  Forgot password?
                </Link>
              </Field>
            )
          }}
        />
      </FieldGroup>

      <form.Subscribe
        selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}
        children={({ canSubmit, isSubmitting }) => (
          <>
            <Button
              type='submit'
              form='sign-in-form'
              className='mt-2 w-full'
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? <Loader2 className='animate-spin' /> : <LogIn />}
              Sign in
            </Button>

            <div className='relative my-2'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-background px-2 text-muted-foreground'>
                  Or continue with
                </span>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <Button variant='outline' type='button' disabled={isSubmitting}>
                <IconGithub className='h-4 w-4' /> GitHub
              </Button>
              <Button variant='outline' type='button' disabled={isSubmitting}>
                <IconFacebook className='h-4 w-4' /> Facebook
              </Button>
            </div>
          </>
        )}
      />
    </form>
  )
}

