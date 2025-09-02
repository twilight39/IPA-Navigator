# Use ARM64 Debian as base image
FROM --platform=linux/amd64 debian:bullseye-slim

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    wget \
    bzip2 \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create mfa user and directories
RUN useradd -ms /bin/bash mfauser
RUN mkdir -p /data /mfa
WORKDIR /home/mfauser

# Install Miniconda for ARM64
RUN mkdir -p ~/miniconda3 && \
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda3/miniconda.sh && \
    bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3 && \
    rm ~/miniconda3/miniconda.sh

# Add conda to path and initialize
ENV PATH=/home/mfauser/miniconda3/bin:$PATH
SHELL ["/bin/bash", "-c"]

# Make conda available in shell scripts
RUN echo ". ~/miniconda3/etc/profile.d/conda.sh" >> ~/.bashrc && \
    source ~/.bashrc && \
    conda init --all && \
    echo "conda activate base" >> ~/.bashrc

# Install mamba and MFA
RUN . ~/miniconda3/etc/profile.d/conda.sh && \
    conda activate base && \
    conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main && \
    conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r &&\
    conda install -y -c conda-forge mamba && \
    mamba create -n aligner -c conda-forge montreal-forced-aligner -y && \
    conda clean -afy

# Set ownership
RUN chown -R mfauser:mfauser /home/mfauser /data /mfa

# Switch to mfa user
USER mfauser
ENV MFA_ROOT_DIR=/mfa
ENV PATH=/home/mfauser/miniconda3/envs/aligner/bin:$PATH

# Set up shell to automatically activate the environment
RUN echo "conda activate aligner" >> ~/.bashrc

# Create a startup script that keeps the container running
RUN echo '#!/bin/bash' > /home/mfauser/startup.sh && \
    echo '. ~/miniconda3/etc/profile.d/conda.sh' >> /home/mfauser/startup.sh && \
    echo 'conda activate aligner' >> /home/mfauser/startup.sh && \
    echo 'echo "MFA container is running. Use docker exec to run commands."' >> /home/mfauser/startup.sh && \
    echo 'echo "Example: docker exec ipa-mfa mfa align /data/input /data/dict/en_us.dict english /data/output"' >> /home/mfauser/startup.sh && \
    echo 'tail -f /dev/null' >> /home/mfauser/startup.sh && \
    chmod +x /home/mfauser/startup.sh

# Set up entrypoint to run the startup script
ENTRYPOINT ["/home/mfauser/startup.sh"]
