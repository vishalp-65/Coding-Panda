import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { authApi } from '@/services/api'
import toast from 'react-hot-toast'

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

const ResetPasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('Invalid reset token')
      return
    }

    try {
      setIsLoading(true)
      await authApi.resetPassword(token, data.password)
      toast.success('Password reset successful!')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Invalid Reset Link</h2>
          <p className="mt-2 text-sm text-gray-600">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <div className="text-center">
          <Link
            to="/forgot-password"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/login"
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to login
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reset your password</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter your new password below.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="mt-1 relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              className="input pr-10"
              placeholder="Enter your new password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="mt-1 relative">
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              className="input pr-10"
              placeholder="Confirm your new password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Resetting...' : 'Reset password'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ResetPasswordPage