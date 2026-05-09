'use client'

import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { PasswordInput } from '@workspace/ui/components/password-input'
import { SelectDropdown } from '@/components/select-dropdown'
import { roles } from '../data/data'
import { type User } from '../data/schema'

const formSchema = z
  .object({
    firstName: z.string().min(1, 'First Name is required.'),
    lastName: z.string().min(1, 'Last Name is required.'),
    username: z.string().min(1, 'Username is required.'),
    phoneNumber: z.string().min(1, 'Phone number is required.'),
    email: z.email({
      error: (iss) => (iss.input === '' ? 'Email is required.' : undefined),
    }),
    password: z.string().transform((pwd) => pwd.trim()),
    role: z.string().min(1, 'Role is required.'),
    confirmPassword: z.string().transform((pwd) => pwd.trim()),
    isEdit: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.isEdit && !data.password) return true
      return data.password.length > 0
    },
    {
      message: 'Password is required.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return password.length >= 8
    },
    {
      message: 'Password must be at least 8 characters long.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return /[a-z]/.test(password)
    },
    {
      message: 'Password must contain at least one lowercase letter.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password }) => {
      if (isEdit && !password) return true
      return /\d/.test(password)
    },
    {
      message: 'Password must contain at least one number.',
      path: ['password'],
    }
  )
  .refine(
    ({ isEdit, password, confirmPassword }) => {
      if (isEdit && !password) return true
      return password === confirmPassword
    },
    {
      message: "Passwords don't match.",
      path: ['confirmPassword'],
    }
  )
type UserForm = z.infer<typeof formSchema>

type UserActionDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const isEdit = !!currentRow
  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          ...currentRow,
          password: '',
          confirmPassword: '',
          isEdit,
        }
      : {
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          role: '',
          phoneNumber: '',
          password: '',
          confirmPassword: '',
          isEdit,
        },
  })

  const onSubmit = (values: UserForm) => {
    form.reset()
    showSubmittedData(values)
    onOpenChange(false)
  }

  const isPasswordTouched = !!form.formState.dirtyFields.password

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset()
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the user here. ' : 'Create new user here. '}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className='h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3'>
          <form
            id='user-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='px-0.5'
          >
            <FieldGroup>
            <Controller
              control={form.control}
              name='firstName'
              render={({ field, fieldState }) => (
                <Field className='grid grid-cols-6 items-center gap-x-4 gap-y-1' data-invalid={fieldState.invalid}>
                  <FieldLabel className='col-span-2 text-end'>First Name</FieldLabel>
                  <Input placeholder='John' className='col-span-4' autoComplete='off' aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError className='col-span-4 col-start-3' errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='lastName'
              render={({ field, fieldState }) => (
                <Field className='grid grid-cols-6 items-center gap-x-4 gap-y-1' data-invalid={fieldState.invalid}>
                  <FieldLabel className='col-span-2 text-end'>Last Name</FieldLabel>
                  <Input placeholder='Doe' className='col-span-4' autoComplete='off' aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError className='col-span-4 col-start-3' errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='username'
              render={({ field, fieldState }) => (
                <Field className='grid grid-cols-6 items-center gap-x-4 gap-y-1' data-invalid={fieldState.invalid}>
                  <FieldLabel className='col-span-2 text-end'>Username</FieldLabel>
                  <Input placeholder='john_doe' className='col-span-4' aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError className='col-span-4 col-start-3' errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='email'
              render={({ field, fieldState }) => (
                <Field className='grid grid-cols-6 items-center gap-x-4 gap-y-1' data-invalid={fieldState.invalid}>
                  <FieldLabel className='col-span-2 text-end'>Email</FieldLabel>
                  <Input placeholder='john.doe@gmail.com' className='col-span-4' aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError className='col-span-4 col-start-3' errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='phoneNumber'
              render={({ field, fieldState }) => (
                <Field className='grid grid-cols-6 items-center gap-x-4 gap-y-1' data-invalid={fieldState.invalid}>
                  <FieldLabel className='col-span-2 text-end'>Phone Number</FieldLabel>
                  <Input placeholder='+123456789' className='col-span-4' aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError className='col-span-4 col-start-3' errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='role'
              render={({ field, fieldState }) => (
                <Field className='grid grid-cols-6 items-center gap-x-4 gap-y-1' data-invalid={fieldState.invalid}>
                  <FieldLabel className='col-span-2 text-end'>Role</FieldLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Select a role'
                    className='col-span-4'
                    items={roles.map(({ label, value }) => ({ label, value }))}
                  />
                  {fieldState.invalid && <FieldError className='col-span-4 col-start-3' errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='password'
              render={({ field, fieldState }) => (
                <Field className='grid grid-cols-6 items-center gap-x-4 gap-y-1' data-invalid={fieldState.invalid}>
                  <FieldLabel className='col-span-2 text-end'>Password</FieldLabel>
                  <PasswordInput placeholder='e.g., S3cur3P@ssw0rd' className='col-span-4' aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError className='col-span-4 col-start-3' errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name='confirmPassword'
              render={({ field, fieldState }) => (
                <Field className='grid grid-cols-6 items-center gap-x-4 gap-y-1' data-invalid={fieldState.invalid}>
                  <FieldLabel className='col-span-2 text-end'>Confirm Password</FieldLabel>
                  <PasswordInput
                    disabled={!isPasswordTouched}
                    placeholder='e.g., S3cur3P@ssw0rd'
                    className='col-span-4'
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && <FieldError className='col-span-4 col-start-3' errors={[fieldState.error]} />}
                </Field>
              )}
            />
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <Button type='submit' form='user-form'>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
