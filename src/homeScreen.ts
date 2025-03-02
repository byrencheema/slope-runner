export function createHomeScreen(): Promise<void> {
    return new Promise((resolve) => {
        const homeDiv = document.createElement('div');
        homeDiv.id = 'home-screen';
        homeDiv.style.position = 'absolute';
        homeDiv.style.width = '100%';
        homeDiv.style.height = '100%';
        homeDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        homeDiv.style.display = 'flex';
        homeDiv.style.flexDirection = 'column';
        homeDiv.style.alignItems = 'center';
        homeDiv.style.justifyContent = 'center';
        homeDiv.style.color = 'white';
        homeDiv.style.fontFamily = 'Arial, sans-serif';
        homeDiv.style.zIndex = '1000';

        const title = document.createElement('h1');
        title.textContent = 'SLOPE RUNNER';
        title.style.fontSize = '64px';
        title.style.marginBottom = '40px';
        title.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';

        const startButton = document.createElement('button');
        startButton.textContent = 'NEW RUN';
        startButton.style.fontSize = '24px';
        startButton.style.padding = '15px 40px';
        startButton.style.cursor = 'pointer';
        startButton.style.backgroundColor = '#4CAF50';
        startButton.style.border = 'none';
        startButton.style.borderRadius = '5px';
        startButton.style.color = 'white';
        startButton.style.transition = 'background-color 0.3s';

        startButton.onmouseover = () => {
            startButton.style.backgroundColor = '#45a049';
        };
        startButton.onmouseout = () => {
            startButton.style.backgroundColor = '#4CAF50';
        };

        startButton.onclick = () => {
            document.body.removeChild(homeDiv);
            resolve();
        };

        homeDiv.appendChild(title);
        homeDiv.appendChild(startButton);
        document.body.appendChild(homeDiv);
    });
} 