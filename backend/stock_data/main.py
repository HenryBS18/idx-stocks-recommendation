from app import App

application = App()
app = application.get_app()

if __name__ == '__main__':
	application.run()