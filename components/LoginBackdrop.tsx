import React, { useEffect, useRef } from 'react';

interface LoginBackdropProps {
  children: React.ReactNode;
}

const LoginBackdrop: React.FC<LoginBackdropProps> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Star = {
      x: number;
      y: number;
      radius: number;
      twinkle: number;
      twinkleSpeed: number;
      alpha: number;
      drift: number;
      bright: boolean;
      ultraBright: boolean;
    };

    type Comet = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      length: number;
      width: number;
      alpha: number;
      delay: number;
    };

    const stars: Star[] = [];
    const comets: Comet[] = [];
    const STAR_COUNT = 1250;
    const COMET_COUNT = 5;

    const resetStar = (star: Star) => {
      star.x = Math.random() * width;
      star.y = Math.random() * height;
      star.radius = 0.35 + Math.random() * 1.1;
      star.twinkle = Math.random() * Math.PI * 2;
      star.twinkleSpeed = 0.004 + Math.random() * 0.01;
      star.alpha = 0.22 + Math.random() * 0.58;
      star.drift = 0.024 + Math.random() * 0.09;
      star.bright = Math.random() > 0.94;
      star.ultraBright = Math.random() > 0.985;
      if (star.bright) {
        star.radius = 1.8 + Math.random() * 1.4;
        star.alpha = 0.6 + Math.random() * 0.28;
      }
      if (star.ultraBright) {
        star.radius = 2 + Math.random() * 1.7;
        star.alpha = 0.95 + Math.random() * 0.05;
      }
    };

    const resetComet = (comet: Comet, stagger = false) => {
      const startFromTop = Math.random() > 0.35;
      comet.x = startFromTop ? Math.random() * width * 0.9 : width + 120 + Math.random() * 260;
      comet.y = startFromTop ? -80 - Math.random() * height * 0.55 : Math.random() * height * 0.45;
      comet.vx = -(7 + Math.random() * 8);
      comet.vy = 3.2 + Math.random() * 4.4;
      comet.length = 120 + Math.random() * 180;
      comet.width = 1.1 + Math.random() * 1.6;
      comet.alpha = 0.55 + Math.random() * 0.35;
      comet.delay = stagger ? Math.random() * 320 : 180 + Math.random() * 420;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (stars.length === 0) {
        for (let i = 0; i < STAR_COUNT; i += 1) {
          const star = {
            x: 0,
            y: 0,
            radius: 0,
            twinkle: 0,
            twinkleSpeed: 0,
            alpha: 0,
            drift: 0,
            bright: false,
            ultraBright: false,
          };
          resetStar(star);
          stars.push(star);
        }
      }

      if (comets.length === 0) {
        for (let i = 0; i < COMET_COUNT; i += 1) {
          const comet = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            length: 0,
            width: 0,
            alpha: 0,
            delay: 0,
          };
          resetComet(comet, true);
          comets.push(comet);
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const baseGradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.14,
        0,
        width * 0.5,
        height * 0.14,
        Math.max(width, height) * 0.7
      );
      baseGradient.addColorStop(0, 'rgba(136, 193, 37, 0.2)');
      baseGradient.addColorStop(0.35, 'rgba(10, 20, 38, 0.1)');
      baseGradient.addColorStop(1, 'rgba(4, 7, 14, 0)');
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, width, height);

      const speedX = 0.09;
      const speedY = 0.028;

      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        star.x -= speedX * star.drift;
        star.y += speedY * star.drift;

        if (star.x < -8) star.x = width + 8;
        if (star.y > height + 8) star.y = -8;

        star.twinkle += star.twinkleSpeed;
        const twinkle = 0.8 + Math.sin(star.twinkle) * 0.1;
        const alpha = Math.min(0.96, star.alpha * twinkle);

        ctx.beginPath();
        const colorMix = star.ultraBright ? '255, 255, 255' : star.bright ? '232, 242, 255' : '188, 214, 235';
        const starAlpha = star.ultraBright ? 1 : alpha * (star.bright ? 0.8 : 0.72);
        ctx.fillStyle = `rgba(${colorMix}, ${starAlpha})`;
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < comets.length; i += 1) {
        const comet = comets[i];
        if (comet.delay > 0) {
          comet.delay -= 1;
          continue;
        }

        comet.x += comet.vx;
        comet.y += comet.vy;

        const tailX = comet.x - comet.vx * comet.length * 0.08;
        const tailY = comet.y - comet.vy * comet.length * 0.08;
        const gradient = ctx.createLinearGradient(comet.x, comet.y, tailX, tailY);
        gradient.addColorStop(0, `rgba(255,255,255,${comet.alpha})`);
        gradient.addColorStop(0.22, `rgba(188,214,235,${comet.alpha * 0.45})`);
        gradient.addColorStop(1, 'rgba(188,214,235,0)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = comet.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(comet.x, comet.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, comet.alpha + 0.18)})`;
        ctx.beginPath();
        ctx.arc(comet.x, comet.y, comet.width * 1.15, 0, Math.PI * 2);
        ctx.fill();

        if (comet.x < -comet.length || comet.y > height + comet.length) {
          resetComet(comet);
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#111111] text-white">
      <style>{`
        @keyframes login-stars-drift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-1.8%, -2.4%, 0) scale(1.035);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes login-nebula-breathe {
          0% {
            transform: scale(1) translate3d(0, 0, 0);
            opacity: 0.22;
          }
          50% {
            transform: scale(1.1) translate3d(0, -2.8%, 0);
            opacity: 0.3;
          }
          100% {
            transform: scale(1) translate3d(0, 0, 0);
            opacity: 0.22;
          }
        }
        @keyframes login-star-twinkle {
          0%, 100% {
            opacity: 0.35;
          }
          50% {
            opacity: 0.85;
          }
        }
        @keyframes login-dust-sweep {
          0% {
            transform: translate3d(-3%, 0, 0) scale(1);
            opacity: 0.24;
          }
          50% {
            transform: translate3d(3%, -2%, 0) scale(1.04);
            opacity: 0.4;
          }
          100% {
            transform: translate3d(-3%, 0, 0) scale(1);
            opacity: 0.24;
          }
        }
        @keyframes login-galaxy-rotate {
          0% {
            transform: rotate(0deg) scale(1);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
        @keyframes login-aurora-flow {
          0% {
            transform: translate3d(-2%, 0, 0);
            opacity: 0.18;
          }
          50% {
            transform: translate3d(2%, -2%, 0);
            opacity: 0.26;
          }
          100% {
            transform: translate3d(-2%, 0, 0);
            opacity: 0.18;
          }
        }
      `}</style>

      <div
        className="absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ opacity: 1 }}
        />
        <div
          className="absolute inset-[-14%]"
          style={{
            background:
              'radial-gradient(circle at 50% 12%, rgba(255,255,255,0.05), transparent 34%), radial-gradient(circle at 82% 68%, rgba(130,150,170,0.05), transparent 30%), radial-gradient(circle at 16% 78%, rgba(255,255,255,0.08), transparent 26%), linear-gradient(180deg, #02040a 0%, #04060c 44%, #010309 100%)',
            transformOrigin: 'center center',
            animation: 'login-nebula-breathe 12s ease-in-out infinite',
            willChange: 'transform',
          }}
        />
        <div
          className="absolute inset-[-20%]"
          style={{
            background:
              'conic-gradient(from 20deg at 50% 68%, rgba(120,140,160,0.08), rgba(120,140,160,0.01) 25%, rgba(90,120,150,0.06) 45%, rgba(120,140,160,0.05) 68%, rgba(120,140,160,0.08))',
            filter: 'blur(36px)',
            animation: 'login-galaxy-rotate 78s linear infinite',
            transformOrigin: '50% 68%',
            opacity: 0.24,
          }}
        />
        <div
          className="absolute inset-[-8%]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 50% 75%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 28%, transparent 60%), radial-gradient(ellipse at 50% 28%, rgba(160,180,200,0.08) 0%, rgba(160,180,200,0.02) 36%, transparent 68%)',
            filter: 'blur(22px)',
            animation: 'login-aurora-flow 11s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-[-10%]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 25%, rgba(255,255,255,0.95) 0 1px, transparent 1.6px), radial-gradient(circle at 78% 18%, rgba(255,255,255,0.9) 0 1px, transparent 1.7px), radial-gradient(circle at 60% 65%, rgba(255,255,255,0.75) 0 1px, transparent 1.5px), radial-gradient(circle at 28% 72%, rgba(255,255,255,0.9) 0 1px, transparent 1.6px), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.85) 0 1px, transparent 1.6px)',
            backgroundSize: '280px 280px, 320px 320px, 260px 260px, 300px 300px, 340px 340px',
            animation: 'login-stars-drift 16s linear infinite',
            opacity: 0.88,
          }}
        />
        <div
          className="absolute inset-[-8%]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 24% 70%, rgba(255,255,255,0.1) 0%, transparent 46%), radial-gradient(ellipse at 78% 62%, rgba(255,255,255,0.08) 0%, transparent 42%), radial-gradient(ellipse at 54% 86%, rgba(140,160,180,0.08) 0%, transparent 40%)',
            animation: 'login-dust-sweep 22s ease-in-out infinite',
            filter: 'blur(24px)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.65) 0 1.3px, transparent 1.8px)',
            backgroundSize: '190px 190px',
            animation: 'login-star-twinkle 3.2s ease-in-out infinite',
            opacity: 0.5,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,8,0.28)_0%,rgba(3,4,8,0.8)_100%)]" />
      </div>

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle at top, rgba(255,255,255,0.04), transparent 34%), radial-gradient(circle at bottom, rgba(255,255,255,0.03), transparent 30%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default LoginBackdrop;
