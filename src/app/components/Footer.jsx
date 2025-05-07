export default function Footer() {
    return (
      <footer className="border-t mt-12 py-6 text-sm text-gray-600 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} The Daily Times. All rights reserved.</p>
          <nav className="flex space-x-4">
            <a href="#" className="hover:underline">About</a>
            <a href="#" className="hover:underline">Contact</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Terms</a>
          </nav>
        </div>
      </footer>
    );
  }
  