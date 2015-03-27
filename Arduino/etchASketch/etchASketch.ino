#include <AccelStepper.h>

#include <aJSON.h>

unsigned long last_print = 0;
aJsonStream serial_stream(&Serial);

AccelStepper Boom(1, 5, 4); // pin 3 = step, pin 6 = direction
AccelStepper Slider(1, 7, 6); // pin 3 = step, pin 6 = direction

double boomStep2Angle = 2/300;
double sliderStep2Distance = 7/300;


void setup(){
	Serial.begin(9600);

	Boom.setMaxSpeed(1400);
	Boom.setAcceleration(600);
	Boom.setSpeed(1200);
	Slider.setMaxSpeed(1400);
	Slider.setAcceleration(600);
	Slider.setSpeed(1200);
}

void loop () {
if (serial_stream.available()) {
    /* First, skip any accidental whitespace like newlines. */
    serial_stream.skip();
  }
  Boom.run();
  Slider.run();

  if (Boom.distanceToGo() == 0 && Slider.distanceToGo() == 0) {
	if (serial_stream.available()) {
		/* Something real on input, let's take a look. */
		aJsonObject *msg = aJson.parse(&serial_stream);
		processMessage(msg);
		aJson.deleteItem(msg);
		}
	}
}

/* Process message like: { "pos": { "x": 0, "y": 128 } } */
void processMessage(aJsonObject *msg)
{
  aJsonObject *pos = aJson.getObjectItem(msg, "pos");
  if (!pos) {
    Serial.println("no pos data");
    return;
  }
  aJsonObject *x = aJson.getObjectItem(pos, "x");
  aJsonObject *y = aJson.getObjectItem(pos, "y");

  int xPos = x->valueint;
  int yPos = y->valueint;

  // travers x en Y
  xPos = xPos + 120; // 120 mm to the right
  yPos = yPos + 120; // 120 mm up

  //long leg

  double longLeg = sqrt(pow(xPos,2) + pow(yPos,2));
  double stepsLongLegPos = longLeg/sliderStep2Distance;

  // angle

  int angle = sin(xPos/longLeg);
  int stepAnglePos = angle/boomStep2Angle;

  int currentAngle = Boom.currentPosition();
  int currentSliderPos = Slider.currentPosition();

  int steps4boom = abs(currentAngle - stepAnglePos);
  int steps4slider = abs(currentSliderPos - stepsLongLegPos);

  if(steps4boom > steps4slider){
      Boom.setSpeed(1200);
      Slider.setSpeed(1200*(steps4slider/steps4boom));
  } else {
  	Slider.setSpeed(1200);
  	Boom.setSpeed(1200*(steps4boom/steps4slider));
  }

  Boom.moveTo(steps4boom);
  Slider.moveTo(steps4slider);

}