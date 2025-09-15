import { Link } from 'react-router-dom';
import { Code, Trophy, Users, Zap } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AC</span>
              </div>
              <span className="font-semibold text-gray-900">
                AI Coding Platform
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="btn-outline">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Master Coding with
            <span className="text-primary-600"> AI-Powered </span>
            Learning
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Practice coding problems, participate in contests, and get
            personalized AI feedback to accelerate your programming journey.
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">
              Start Learning
            </Link>
            <Link to="/problems" className="btn-outline text-lg px-8 py-3">
              Browse Problems
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to excel
            </h2>
            <p className="text-lg text-gray-600">
              Comprehensive tools and features designed for modern developers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Code className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Smart Code Editor
              </h3>
              <p className="text-gray-600">
                Monaco-powered editor with syntax highlighting, autocomplete,
                and multi-language support
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-success-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI-Powered Hints
              </h3>
              <p className="text-gray-600">
                Get intelligent hints and explanations tailored to your coding
                style and skill level
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-warning-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Live Contests
              </h3>
              <p className="text-gray-600">
                Participate in real-time coding contests with live leaderboards
                and rankings
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Community
              </h3>
              <p className="text-gray-600">
                Connect with other developers, share solutions, and learn
                together
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to level up your coding skills?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of developers already improving their skills
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 transition-colors"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AC</span>
              </div>
              <span className="font-semibold">AI Coding Platform</span>
            </div>
            <p className="text-gray-400">
              © 2025 AI Coding Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
