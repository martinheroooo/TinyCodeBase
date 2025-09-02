import os
import subprocess

def clone_repository(repo_url, target_dir):
    """
    克隆GitHub仓库到指定目录
    """
    if os.path.exists(target_dir):
        print(f"目录 {target_dir} 已存在，跳过克隆")
        return True
    
    try:
        print(f"正在克隆仓库 {repo_url} 到 {target_dir}...")
        subprocess.run(['git', 'clone', repo_url, target_dir], check=True)
        print(f"成功克隆仓库到 {target_dir}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"克隆仓库失败: {e}")
        return False
    except FileNotFoundError:
        print("错误: 未找到git命令，请确保已安装git")
        return False