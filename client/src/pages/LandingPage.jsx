import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
            <div className="text-center max-w-2xl px-4">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
                    Garments ERP
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    The complete solution for managing production, inventory, and workforce for the garment manufacturing industry.
                </p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:text-lg"
                    >
                        Login
                    </button>
                    <button
                        onClick={() => navigate('/signup')}
                        className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 md:text-lg"
                    >
                        Sign Up
                    </button>
                </div>
            </div>
        </div>
    );
}
