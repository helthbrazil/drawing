import { AfterViewInit, Component, ElementRef, ViewChild, HostListener } from '@angular/core';

@Component({
  selector: 'app-draw',
  standalone: true,
  templateUrl: './draw.component.html',
  styleUrls: ['./draw.component.css']
})
export class DrawComponent implements AfterViewInit {
  @ViewChild('canvas', { static: false }) canvas!: ElementRef;

  shapeType: 'rectangle' | 'circle' | 'line' = 'rectangle'; // Tipo de forma padrão é retângulo
  lineWidth: number = 2; // Largura da linha, padrão é 2
  arrowSize: number = 10; // Tamanho da seta nas extremidades
  borderColor = 'yellow';
  fillColor = 'rgba(255, 255, 0, 0.3)'; // Amarelo translúcido

  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing: boolean = false;
  private isDragging: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private rectWidth: number = 0;
  private rectHeight: number = 0;
  private draggingShape: any = null; // Forma que está sendo arrastada
  private drawingData: any[] = []; // Armazena os desenhos feitos
  private drawingIdCounter: number = 0; // Contador para IDs incrementais

  ngAfterViewInit() {
    setTimeout(() => {
      this.ctx = this.canvas.nativeElement.getContext('2d');
      if (this.ctx) {
        this.initCanvas();
      }
    });
  }

  // Método para inicializar o canvas
  initCanvas(): void {
    const canvasElement = this.canvas.nativeElement;
    canvasElement.width = canvasElement.offsetWidth;  // Garantir que o canvas tenha o mesmo tamanho do contêiner
    canvasElement.height = canvasElement.offsetHeight;
  }

  // Inicia o desenho
  startDrawing(event: MouseEvent) {
    if (this.isDragging) {
      return; // Não começa o desenho se estiver arrastando
    }

    this.isDrawing = true;
    this.startX = event.offsetX;
    this.startY = event.offsetY;
  }

  // Função para desenhar
  draw(event: MouseEvent) {
    if (!this.isDrawing && !this.isDragging) return;

    const currentX = event.offsetX;
    const currentY = event.offsetY;

    if (this.isDragging && this.draggingShape) {
      const dx = currentX - this.startX;
      const dy = currentY - this.startY;

      // Limpa apenas a área onde o desenho atual estava sendo feito (não todo o canvas)
      this.clearCurrentDrawingArea();

      // Atualiza a posição da forma arrastada
      this.draggingShape.startX += dx;
      this.draggingShape.startY += dy;

      // Desenha todas as formas novamente
      this.drawingData.forEach((data) => {
        if (data.shapeType === 'rectangle') {
          this.drawRectangle(data.startX, data.startY, data.width, data.height, data.borderColor, data.fillColor);
        } else if (data.shapeType === 'circle') {
          this.drawCircle(data.startX, data.startY, data.radius, data.borderColor, data.fillColor);
        } else if (data.shapeType === 'line') {
          this.drawLineWithArrows(data.startX, data.startY, data.endX, data.endY, data.borderColor);
        }
      });

      // Atualiza o ponto de referência do arrasto
      this.startX = currentX;
      this.startY = currentY;

    } else if (this.isDrawing) {
      const width = currentX - this.startX;
      const height = currentY - this.startY;

      let drawWidth = width;
      let drawHeight = height;

      if (event.shiftKey) {
        const size = Math.min(Math.abs(width), Math.abs(height));
        drawWidth = drawHeight = size;
      }

      // Limpa a área de desenho onde o desenho está sendo feito
      this.clearCurrentDrawingArea();

      // Desenha todas as formas anteriores com as cores originais
      this.drawingData.forEach((data) => {
        if (data.shapeType === 'rectangle') {
          this.drawRectangle(data.startX, data.startY, data.width, data.height, data.borderColor, data.fillColor);
        } else if (data.shapeType === 'circle') {
          this.drawCircle(data.startX, data.startY, data.radius, data.borderColor, data.fillColor);
        } else if (data.shapeType === 'line') {
          this.drawLineWithArrows(data.startX, data.startY, data.endX, data.endY, data.borderColor);
        }
      });

      // Desenha a forma sendo criada com as cores atuais
      if (this.shapeType === 'rectangle') {
        this.drawRectangle(this.startX, this.startY, drawWidth, drawHeight, this.borderColor, this.fillColor);
      } else if (this.shapeType === 'circle') {
        this.drawCircle(this.startX, this.startY, Math.abs(drawWidth), this.borderColor, this.fillColor);
      } else if (this.shapeType === 'line') {
        this.drawLineWithArrows(this.startX, this.startY, currentX, currentY, this.borderColor);
      }

      // Atualiza as dimensões do retângulo
      this.rectWidth = Math.abs(currentX - this.startX);
      this.rectHeight = Math.abs(currentY - this.startY);
    }
  }

  resetDrawing() {
    // Limpa o canvas
    this.clearCanvas();

    // Reseta a lista de desenhos
    this.drawingData = [];
  }

  clearCanvas() {
    if (this.ctx) {
      const canvas = this.canvas.nativeElement;
      this.ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa todo o canvas
    }
  }

  undo() {
    // Remove o último desenho da lista de desenhos
    this.drawingData.pop();

    // Limpa o canvas
    this.clearCanvas();

    // Redesenha todos os desenhos restantes no array
    this.drawingData.forEach((data) => {
      if (data.shapeType === 'rectangle') {
        this.drawRectangle(data.startX, data.startY, data.width, data.height, data.borderColor, data.fillColor);
      } else if (data.shapeType === 'circle') {
        this.drawCircle(data.startX, data.startY, data.radius, data.borderColor, data.fillColor);
      } else if (data.shapeType === 'line') {
        this.drawLineWithArrows(data.startX, data.startY, data.endX, data.endY, data.borderColor);
      }
    });
  }


  stopDrawing() {
    this.isDrawing = false;

    // Salva o desenho atual apenas se for válido
    const currentDrawing = {
      shapeType: this.shapeType,
      startX: this.startX,
      startY: this.startY,
      width: Math.abs(this.startX - this.startX + this.rectWidth),
      height: Math.abs(this.startY - this.startY + this.rectHeight),
      radius: Math.abs(this.rectWidth), // Para o círculo, usa-se a largura como raio
      endX: this.startX + this.rectWidth,
      endY: this.startY + this.rectHeight,
      borderColor: this.borderColor,
      fillColor: this.fillColor,
    };

    // Verificar se o desenho atual é válido e não é duplicado
    const isInvalidDrawing = currentDrawing.startX === 0 && currentDrawing.startY === 0;
    const isDuplicate = this.drawingData.some(
      (data) =>
        data.shapeType === currentDrawing.shapeType &&
        data.startX === currentDrawing.startX &&
        data.startY === currentDrawing.startY
    );

    debugger
    if (!isInvalidDrawing && !isDuplicate) {
      this.drawingData.push(currentDrawing); // Adiciona somente se não for inválido nem duplicado
    }

    // Reset das variáveis de desenho temporário
    this.rectWidth = 0;
    this.rectHeight = 0;
  }


  // Limpa a área onde o desenho atual está sendo feito
  clearCurrentDrawingArea() {
    if (this.ctx) {
      // Limpa a área onde o novo desenho está sendo feito
      this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    }
  }

  // Funções de desenho com setas nas extremidades da linha
  drawRectangle(x: number, y: number, width: number, height: number, borderColor: string, fillColor: string) {
    if (this.ctx) {
      this.ctx.beginPath();
      // Preenche o retângulo com a cor do fundo
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(x, y, width, height);
      // Borda do retângulo
      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.stroke();
    }
  }

  drawCircle(x: number, y: number, radius: number, borderColor: string, fillColor: string) {
    if (this.ctx) {
      this.ctx.beginPath();
      // Preenche o círculo com a cor do fundo
      this.ctx.fillStyle = fillColor;
      this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
      this.ctx.fill(); // Preenche
      // Borda do círculo
      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.stroke();
    }
  }

  drawLineWithArrows(x1: number, y1: number, x2: number, y2: number, borderColor: string) {
    if (this.ctx) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = this.arrowSize;

      // Desenha a linha
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.stroke();

      // Desenha as setas nas extremidades
      this.drawArrowhead(x2, y2, angle);
      this.drawArrowhead(x1, y1, angle + Math.PI);
    }
  }

  // Função para desenhar a seta
  drawArrowhead(x: number, y: number, angle: number) {
    const headLength = this.arrowSize;
    this.ctx?.moveTo(x, y);
    this.ctx?.lineTo(x - headLength * Math.cos(angle - Math.PI / 6), y - headLength * Math.sin(angle - Math.PI / 6));
    this.ctx?.moveTo(x, y);
    this.ctx?.lineTo(x - headLength * Math.cos(angle + Math.PI / 6), y - headLength * Math.sin(angle + Math.PI / 6));
    this.ctx?.stroke();
  }


  onShapeChange(shape: string) {
    this.shapeType = shape as 'rectangle' | 'circle' | 'line';

    // Define as cores com base no tipo de forma
    if (this.shapeType === 'rectangle') {
      this.borderColor = 'yellow';
      this.fillColor = 'rgba(255, 255, 0, 0.3)'; // Amarelo translúcido
    } else if (this.shapeType === 'circle') {
      this.borderColor = 'blue';
      this.fillColor = 'rgba(0, 0, 255, 0.3)'; // Azul translúcido
    } else if (this.shapeType === 'line') {
      this.borderColor = 'green';
      this.fillColor = 'rgba(0, 255, 0, 0.3)'; // Verde translúcido
    }
  }

}
