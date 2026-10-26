# Step 1: Use official lightweight Nginx Alpine image (~23MB)
FROM nginx:alpine

# Step 2: Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Step 3: Copy website files into Nginx public directory
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# Step 4: Document the container port
EXPOSE 80

# Step 5: Start Nginx in foreground (standard container process)
CMD ["nginx", "-g", "daemon off;"]
